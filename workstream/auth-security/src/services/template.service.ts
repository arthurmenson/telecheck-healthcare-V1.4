import fs from 'fs';
import path from 'path';
import mjml from 'mjml';
import {
  EmailTemplate,
  EmailVerificationData,
  PasswordResetData,
  UsernameReminderData,
  WelcomeEmailData
} from '../types/email';

export class TemplateService {
  private templatesPath: string;
  private baseTemplate: string;

  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
    this.baseTemplate = this.loadTemplate('base.mjml');
  }

  private loadTemplate(filename: string): string {
    const filePath = path.join(this.templatesPath, filename);
    return fs.readFileSync(filePath, 'utf8');
  }

  private compileTemplate(templateContent: string, data: Record<string, any>): string {
    let compiled = templateContent;

    // Replace all template variables
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      compiled = compiled.replace(regex, String(value));
    });

    return compiled;
  }

  private renderMjml(mjmlContent: string): { html: string; text: string } {
    const result = mjml(mjmlContent, {
      keepComments: false,
      beautify: true,
      fonts: {
        'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
      }
    });

    if (result.errors.length > 0) {
      console.warn('MJML compilation warnings:', result.errors);
    }

    // Generate plain text version (basic HTML stripping)
    const text = result.html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      html: result.html,
      text
    };
  }

  generateVerificationEmail(data: EmailVerificationData): EmailTemplate {
    const contentTemplate = this.loadTemplate('verification.mjml');
    const content = this.compileTemplate(contentTemplate, data);

    const fullTemplate = this.baseTemplate
      .replace('{{{ content }}}', content)
      .replace('{{ email }}', data.email);

    const compiled = this.compileTemplate(fullTemplate, data);
    const rendered = this.renderMjml(compiled);

    return {
      subject: 'Verify your Telecheck Health account',
      html: rendered.html,
      text: rendered.text
    };
  }

  generatePasswordResetEmail(data: PasswordResetData): EmailTemplate {
    const contentTemplate = this.loadTemplate('password-reset.mjml');
    const content = this.compileTemplate(contentTemplate, data);

    const fullTemplate = this.baseTemplate
      .replace('{{{ content }}}', content)
      .replace('{{ email }}', data.email);

    const compiled = this.compileTemplate(fullTemplate, data);
    const rendered = this.renderMjml(compiled);

    return {
      subject: 'Reset your Telecheck Health password',
      html: rendered.html,
      text: rendered.text
    };
  }

  generateUsernameReminderEmail(data: UsernameReminderData & { loginUrl: string }): EmailTemplate {
    const contentTemplate = this.loadTemplate('username-reminder.mjml');
    const content = this.compileTemplate(contentTemplate, data);

    const fullTemplate = this.baseTemplate
      .replace('{{{ content }}}', content)
      .replace('{{ email }}', data.email);

    const compiled = this.compileTemplate(fullTemplate, data);
    const rendered = this.renderMjml(compiled);

    return {
      subject: 'Your Telecheck Health username reminder',
      html: rendered.html,
      text: rendered.text
    };
  }

  generateWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
    // For now, we'll reuse the verification template structure
    // but you can create a separate welcome.mjml template later

    const contentTemplate = `
      <mj-text font-size="20px" font-weight="600" color="#1e293b" padding="0 0 20px 0">
        Welcome to Telecheck Health, {{ firstName }}!
      </mj-text>

      <mj-text padding="0 0 20px 0">
        Your account has been successfully verified and you're ready to start using Telecheck Health's comprehensive healthcare platform.
      </mj-text>

      <mj-text padding="0 0 30px 0">
        Click the button below to access your dashboard:
      </mj-text>

      <mj-button css-class="button-primary" href="{{ loginUrl }}" padding="0 0 30px 0">
        Access Dashboard
      </mj-button>

      <mj-divider border-color="#e2e8f0" padding="20px 0" />

      <mj-text css-class="text-muted" font-size="14px" padding="0">
        Thank you for choosing Telecheck Health for your healthcare needs. If you have any questions, our support team is here to help.
      </mj-text>
    `;

    const fullTemplate = this.baseTemplate
      .replace('{{{ content }}}', contentTemplate)
      .replace('{{ email }}', data.email);

    const compiled = this.compileTemplate(fullTemplate, data);
    const rendered = this.renderMjml(compiled);

    return {
      subject: 'Welcome to Telecheck Health!',
      html: rendered.html,
      text: rendered.text
    };
  }
}