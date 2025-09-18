export class HL7Parser {
  parse(hl7Message: string): any {
    // Basic HL7 message parsing
    const segments = hl7Message.split('\r');
    const parsed: any = {};

    for (const segment of segments) {
      const fields = segment.split('|');
      const segmentType = fields[0];

      switch (segmentType) {
        case 'MSH':
          parsed.messageHeader = {
            sendingApplication: fields[2],
            sendingFacility: fields[3],
            receivingApplication: fields[4],
            receivingFacility: fields[5],
            timestamp: fields[6],
            messageType: fields[8],
            messageControlId: fields[9]
          };
          break;
        case 'PID':
          parsed.patient = {
            patientId: fields[2],
            name: fields[5],
            birthDate: fields[7],
            gender: fields[8],
            address: fields[11]
          };
          break;
        case 'EVN':
          parsed.event = {
            eventTypeCode: fields[1],
            recordedDateTime: fields[2]
          };
          break;
      }
    }

    return parsed;
  }

  generate(messageType: string, data: any): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '');
    const controlId = Date.now().toString();

    let message = `MSH|^~\\&|SPARK_PMS|FACILITY|RECEIVING_APP|RECEIVING_FACILITY|${timestamp}||${messageType}|${controlId}|P|2.5\r`;

    if (messageType === 'ADT^A08') {
      message += `EVN||${timestamp}||||\r`;
      message += `PID|1||${data.patientId}^^^FACILITY^MR||${data.lastName}^${data.firstName}^${data.middleName}||${data.birthDate}|${data.gender}|||${data.address}||(${data.phone})||${data.language}|${data.maritalStatus}|||||||||||||||\r`;
    }

    return message;
  }
}