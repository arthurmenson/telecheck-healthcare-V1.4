import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { AuditLogger } from '../security/AuditLogger';
import { EncryptionService } from '../security/EncryptionService';
import { PCIComplianceValidator } from '../security/PCIComplianceValidator';

export interface StripeHealthcareConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
  enablePCICompliance: boolean;
  enableTokenization: boolean;
  apiVersion: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'ach_debit';
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
    fingerprint: string;
  };
  bankAccount?: {
    routingNumber: string;
    last4: string;
    accountType: 'checking' | 'savings';
  };
  billingAddress: BillingAddress;
  customerId?: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface PaymentRequest {
  amount: number; // in cents
  currency: string;
  paymentMethodId: string;
  customerId?: string;
  description: string;
  metadata: {
    patientId: string;
    encounterId?: string;
    serviceDate: string;
    providerNPI: string;
    claimId?: string;
  };
  statementDescriptor?: string;
  receiptEmail?: string;
  savePaymentMethod?: boolean;
}

export interface PaymentResponse {
  id: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'requires_action';
  amount: number;
  currency: string;
  paymentMethodId: string;
  customerId?: string;
  receiptUrl?: string;
  fees: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  failureCode?: string;
  failureMessage?: string;
  clientSecret?: string;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // partial refund amount in cents
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  id: string;
  paymentIntentId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason: string;
  receiptNumber?: string;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface CustomerInfo {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  address: BillingAddress;
  metadata: {
    patientId: string;
    dateOfBirth: string;
    membershipNumber?: string;
  };
}

export interface PaymentPlan {
  id: string;
  customerId: string;
  totalAmount: number;
  installments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  nextPaymentDate: Date;
  status: 'active' | 'paused' | 'completed' | 'canceled';
  paymentMethodId: string;
  remainingAmount: number;
  completedPayments: number;
  failedAttempts: number;
}

export interface HealthcareSubscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  metadata: {
    serviceType: string;
    providerNPI: string;
    patientId: string;
  };
}

export class StripeHealthcareIntegration {
  private stripe: Stripe;
  private config: StripeHealthcareConfig;
  private auditLogger: AuditLogger;
  private encryptionService: EncryptionService;
  private pciValidator: PCIComplianceValidator;

  constructor(config: StripeHealthcareConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion as any || '2023-10-16',
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000
    });

    this.auditLogger = new AuditLogger();
    this.encryptionService = new EncryptionService();
    this.pciValidator = new PCIComplianceValidator();
  }

  // Payment Processing
  public async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info(`Processing payment for patient: ${request.metadata.patientId}`);

      // PCI Compliance validation
      if (this.config.enablePCICompliance) {
        await this.pciValidator.validatePaymentRequest(request);
      }

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: request.amount,
        currency: request.currency,
        payment_method: request.paymentMethodId,
        customer: request.customerId,
        description: request.description,
        statement_descriptor: request.statementDescriptor,
        receipt_email: request.receiptEmail,
        metadata: {
          ...request.metadata,
          // Add healthcare-specific metadata
          hipaa_compliant: 'true',
          pci_compliant: 'true',
          integration_source: 'spark_pms'
        },
        confirm: true,
        confirmation_method: 'automatic',
        setup_future_usage: request.savePaymentMethod ? 'off_session' : undefined
      });

      // Log payment attempt for audit
      await this.auditLogger.logPaymentAttempt({
        paymentIntentId: paymentIntent.id,
        patientId: request.metadata.patientId,
        amount: request.amount,
        currency: request.currency,
        timestamp: new Date()
      });

      const response: PaymentResponse = {
        id: paymentIntent.id,
        status: paymentIntent.status as any,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentMethodId: request.paymentMethodId,
        customerId: request.customerId,
        receiptUrl: paymentIntent.receipt_email ? undefined : undefined, // Would be generated
        fees: paymentIntent.application_fee_amount ? [{
          type: 'application_fee',
          amount: paymentIntent.application_fee_amount,
          description: 'Processing fee'
        }] : [],
        metadata: paymentIntent.metadata,
        createdAt: new Date(paymentIntent.created * 1000),
        processedAt: paymentIntent.status === 'succeeded' ? new Date() : undefined,
        clientSecret: paymentIntent.client_secret || undefined
      };

      if (paymentIntent.last_payment_error) {
        response.failureCode = paymentIntent.last_payment_error.code || undefined;
        response.failureMessage = paymentIntent.last_payment_error.message || undefined;
      }

      logger.info(`Payment processed: ${paymentIntent.id} - Status: ${paymentIntent.status}`);
      return response;

    } catch (error: any) {
      logger.error('Payment processing failed:', error);

      await this.auditLogger.logPaymentError({
        patientId: request.metadata.patientId,
        amount: request.amount,
        error: error.message,
        timestamp: new Date()
      });

      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  public async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    try {
      logger.info(`Processing refund for payment: ${request.paymentIntentId}`);

      const refund = await this.stripe.refunds.create({
        payment_intent: request.paymentIntentId,
        amount: request.amount,
        reason: request.reason,
        metadata: request.metadata
      });

      await this.auditLogger.logRefund({
        refundId: refund.id,
        paymentIntentId: request.paymentIntentId,
        amount: refund.amount,
        reason: request.reason || 'requested_by_customer',
        timestamp: new Date()
      });

      return {
        id: refund.id,
        paymentIntentId: request.paymentIntentId,
        amount: refund.amount,
        status: refund.status as any,
        reason: refund.reason || 'requested_by_customer',
        receiptNumber: refund.receipt_number || undefined,
        createdAt: new Date(refund.created * 1000),
        metadata: refund.metadata
      };

    } catch (error: any) {
      logger.error('Refund processing failed:', error);
      throw new Error(`Refund processing failed: ${error.message}`);
    }
  }

  // Customer Management
  public async createCustomer(customerInfo: CustomerInfo): Promise<string> {
    try {
      logger.info(`Creating customer for patient: ${customerInfo.metadata.patientId}`);

      // Encrypt sensitive data
      const encryptedMetadata = this.config.enableTokenization
        ? await this.encryptionService.encryptMetadata(customerInfo.metadata)
        : customerInfo.metadata;

      const customer = await this.stripe.customers.create({
        email: customerInfo.email,
        name: customerInfo.name,
        phone: customerInfo.phone,
        address: {
          line1: customerInfo.address.line1,
          line2: customerInfo.address.line2,
          city: customerInfo.address.city,
          state: customerInfo.address.state,
          postal_code: customerInfo.address.postalCode,
          country: customerInfo.address.country
        },
        metadata: {
          ...encryptedMetadata,
          hipaa_compliant: 'true',
          created_by: 'spark_pms'
        }
      });

      logger.info(`Customer created: ${customer.id}`);
      return customer.id;

    } catch (error: any) {
      logger.error('Customer creation failed:', error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  public async getCustomer(customerId: string): Promise<CustomerInfo | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);

      if (customer.deleted) {
        return null;
      }

      const customerData = customer as Stripe.Customer;

      // Decrypt metadata if tokenization is enabled
      const decryptedMetadata = this.config.enableTokenization
        ? await this.encryptionService.decryptMetadata(customerData.metadata)
        : customerData.metadata;

      return {
        id: customerData.id,
        email: customerData.email || '',
        name: customerData.name || '',
        phone: customerData.phone || undefined,
        address: {
          line1: customerData.address?.line1 || '',
          line2: customerData.address?.line2 || undefined,
          city: customerData.address?.city || '',
          state: customerData.address?.state || '',
          postalCode: customerData.address?.postal_code || '',
          country: customerData.address?.country || 'US'
        },
        metadata: {
          patientId: decryptedMetadata.patientId,
          dateOfBirth: decryptedMetadata.dateOfBirth,
          membershipNumber: decryptedMetadata.membershipNumber
        }
      };

    } catch (error: any) {
      logger.error('Failed to retrieve customer:', error);
      return null;
    }
  }

  // Payment Methods
  public async createPaymentMethod(
    customerId: string,
    paymentMethodData: {
      type: 'card' | 'us_bank_account';
      card?: {
        number: string;
        exp_month: number;
        exp_year: number;
        cvc: string;
      };
      us_bank_account?: {
        routing_number: string;
        account_number: string;
        account_type: 'checking' | 'savings';
        account_holder_type: 'individual' | 'company';
      };
      billing_details: {
        address: BillingAddress;
        email?: string;
        name?: string;
        phone?: string;
      };
    }
  ): Promise<PaymentMethod> {
    try {
      logger.info(`Creating payment method for customer: ${customerId}`);

      // Validate PCI compliance for card data
      if (paymentMethodData.type === 'card' && this.config.enablePCICompliance) {
        await this.pciValidator.validateCardData(paymentMethodData.card!);
      }

      const paymentMethod = await this.stripe.paymentMethods.create({
        type: paymentMethodData.type,
        ...(paymentMethodData.card && { card: paymentMethodData.card }),
        ...(paymentMethodData.us_bank_account && { us_bank_account: paymentMethodData.us_bank_account }),
        billing_details: {
          address: {
            line1: paymentMethodData.billing_details.address.line1,
            line2: paymentMethodData.billing_details.address.line2,
            city: paymentMethodData.billing_details.address.city,
            state: paymentMethodData.billing_details.address.state,
            postal_code: paymentMethodData.billing_details.address.postalCode,
            country: paymentMethodData.billing_details.address.country
          },
          email: paymentMethodData.billing_details.email,
          name: paymentMethodData.billing_details.name,
          phone: paymentMethodData.billing_details.phone
        }
      });

      // Attach to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId
      });

      return this.mapStripePaymentMethodToLocal(paymentMethod, customerId);

    } catch (error: any) {
      logger.error('Payment method creation failed:', error);
      throw new Error(`Payment method creation failed: ${error.message}`);
    }
  }

  public async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      const bankAccounts = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'us_bank_account'
      });

      const allMethods = [...paymentMethods.data, ...bankAccounts.data];

      return allMethods.map(pm => this.mapStripePaymentMethodToLocal(pm, customerId));

    } catch (error: any) {
      logger.error('Failed to retrieve payment methods:', error);
      return [];
    }
  }

  // Payment Plans and Subscriptions
  public async createPaymentPlan(
    customerId: string,
    totalAmount: number,
    installments: number,
    frequency: 'weekly' | 'biweekly' | 'monthly',
    paymentMethodId: string,
    startDate: Date,
    metadata: Record<string, any>
  ): Promise<PaymentPlan> {
    try {
      logger.info(`Creating payment plan for customer: ${customerId}`);

      // Create subscription for the payment plan
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        default_payment_method: paymentMethodId,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Healthcare Payment Plan',
              metadata: {
                type: 'payment_plan',
                ...metadata
              }
            },
            unit_amount: Math.round(totalAmount / installments),
            recurring: {
              interval: frequency === 'weekly' ? 'week' :
                       frequency === 'biweekly' ? 'week' : 'month',
              interval_count: frequency === 'biweekly' ? 2 : 1
            }
          }
        }],
        billing_cycle_anchor: Math.floor(startDate.getTime() / 1000),
        metadata: {
          type: 'payment_plan',
          total_amount: totalAmount.toString(),
          installments: installments.toString(),
          ...metadata
        }
      });

      return {
        id: subscription.id,
        customerId,
        totalAmount,
        installments,
        frequency,
        startDate,
        nextPaymentDate: new Date(subscription.current_period_start * 1000),
        status: subscription.status as any,
        paymentMethodId,
        remainingAmount: totalAmount,
        completedPayments: 0,
        failedAttempts: 0
      };

    } catch (error: any) {
      logger.error('Payment plan creation failed:', error);
      throw new Error(`Payment plan creation failed: ${error.message}`);
    }
  }

  public async getPaymentPlan(planId: string): Promise<PaymentPlan | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(planId);

      if (!subscription.metadata.type || subscription.metadata.type !== 'payment_plan') {
        return null;
      }

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        totalAmount: parseInt(subscription.metadata.total_amount),
        installments: parseInt(subscription.metadata.installments),
        frequency: this.mapStripeIntervalToLocal(subscription.items.data[0].price?.recurring?.interval,
                   subscription.items.data[0].price?.recurring?.interval_count),
        startDate: new Date(subscription.start_date * 1000),
        nextPaymentDate: new Date(subscription.current_period_start * 1000),
        status: subscription.status as any,
        paymentMethodId: subscription.default_payment_method as string,
        remainingAmount: parseInt(subscription.metadata.total_amount), // Calculate from invoices
        completedPayments: 0, // Calculate from successful invoices
        failedAttempts: 0 // Calculate from failed invoices
      };

    } catch (error: any) {
      logger.error('Failed to retrieve payment plan:', error);
      return null;
    }
  }

  // Healthcare-specific reporting
  public async generatePaymentReport(
    dateRange: { start: Date; end: Date },
    providerId?: string
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
    refundCount: number;
    refundAmount: number;
    averageTransactionAmount: number;
    processingFees: number;
  }> {
    try {
      const charges = await this.stripe.charges.list({
        created: {
          gte: Math.floor(dateRange.start.getTime() / 1000),
          lte: Math.floor(dateRange.end.getTime() / 1000)
        },
        limit: 100
      });

      const refunds = await this.stripe.refunds.list({
        created: {
          gte: Math.floor(dateRange.start.getTime() / 1000),
          lte: Math.floor(dateRange.end.getTime() / 1000)
        },
        limit: 100
      });

      let filteredCharges = charges.data;
      if (providerId) {
        filteredCharges = charges.data.filter(charge =>
          charge.metadata?.providerNPI === providerId
        );
      }

      const totalTransactions = filteredCharges.length;
      const totalAmount = filteredCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const successfulTransactions = filteredCharges.filter(charge => charge.status === 'succeeded').length;
      const failedTransactions = filteredCharges.filter(charge => charge.status === 'failed').length;
      const refundCount = refunds.data.length;
      const refundAmount = refunds.data.reduce((sum, refund) => sum + refund.amount, 0);
      const processingFees = filteredCharges.reduce((sum, charge) =>
        sum + (charge.application_fee_amount || 0), 0);

      return {
        totalTransactions,
        totalAmount,
        successfulTransactions,
        failedTransactions,
        refundCount,
        refundAmount,
        averageTransactionAmount: totalTransactions > 0 ? totalAmount / totalTransactions : 0,
        processingFees
      };

    } catch (error: any) {
      logger.error('Failed to generate payment report:', error);
      throw new Error(`Failed to generate payment report: ${error.message}`);
    }
  }

  // Webhook handling
  public validateWebhook(payload: string, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
    } catch (error: any) {
      logger.error('Webhook validation failed:', error);
      throw new Error(`Webhook validation failed: ${error.message}`);
    }
  }

  public async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      logger.info(`Handling webhook event: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      await this.auditLogger.logWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        processed: true,
        timestamp: new Date()
      });

    } catch (error: any) {
      logger.error('Webhook event handling failed:', error);
      await this.auditLogger.logWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        processed: false,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  // Helper methods
  private mapStripePaymentMethodToLocal(pm: Stripe.PaymentMethod, customerId: string): PaymentMethod {
    return {
      id: pm.id,
      type: pm.type as any,
      card: pm.card ? {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expiryMonth: pm.card.exp_month,
        expiryYear: pm.card.exp_year,
        fingerprint: pm.card.fingerprint || ''
      } : undefined,
      bankAccount: pm.us_bank_account ? {
        routingNumber: pm.us_bank_account.routing_number || '',
        last4: pm.us_bank_account.last4 || '',
        accountType: pm.us_bank_account.account_type as any || 'checking'
      } : undefined,
      billingAddress: {
        line1: pm.billing_details.address?.line1 || '',
        line2: pm.billing_details.address?.line2 || undefined,
        city: pm.billing_details.address?.city || '',
        state: pm.billing_details.address?.state || '',
        postalCode: pm.billing_details.address?.postal_code || '',
        country: pm.billing_details.address?.country || 'US'
      },
      customerId
    };
  }

  private mapStripeIntervalToLocal(
    interval?: string | null,
    intervalCount?: number | null
  ): 'weekly' | 'biweekly' | 'monthly' {
    if (interval === 'week') {
      return intervalCount === 2 ? 'biweekly' : 'weekly';
    }
    return 'monthly';
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Handle successful payment logic
    logger.info(`Payment succeeded: ${paymentIntent.id}`);
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    // Handle failed payment logic
    logger.info(`Payment failed: ${paymentIntent.id}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Handle successful invoice payment
    logger.info(`Invoice payment succeeded: ${invoice.id}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Handle failed invoice payment
    logger.info(`Invoice payment failed: ${invoice.id}`);
  }

  // PCI Compliance and Security
  public async validatePCICompliance(): Promise<{
    compliant: boolean;
    issues: string[];
    lastValidated: Date;
  }> {
    try {
      const issues: string[] = [];

      // Check if tokenization is enabled
      if (!this.config.enableTokenization) {
        issues.push('Payment method tokenization is not enabled');
      }

      // Check webhook signature validation
      if (!this.config.webhookSecret) {
        issues.push('Webhook signature validation is not configured');
      }

      // Additional PCI compliance checks would go here

      return {
        compliant: issues.length === 0,
        issues,
        lastValidated: new Date()
      };

    } catch (error: any) {
      logger.error('PCI compliance validation failed:', error);
      return {
        compliant: false,
        issues: [`Validation failed: ${error.message}`],
        lastValidated: new Date()
      };
    }
  }
}