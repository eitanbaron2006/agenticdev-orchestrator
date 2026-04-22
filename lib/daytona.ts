import { Daytona } from '@daytonaio/sdk';

let daytonaClient: Daytona | null = null;

export function getDaytonaClient(): Daytona {
  if (!daytonaClient) {
    const apiKey = process.env.DAYTONA_API_KEY;
    const apiUrl = process.env.DAYTONA_API_URL || 'http://localhost:3002/api';

    if (!apiKey) {
      throw new Error(
        'DAYTONA_API_KEY is not set. See DAYTONA_SETUP.md for instructions.'
      );
    }

    daytonaClient = new Daytona({
      apiKey,
      apiUrl,
    });
  }

  return daytonaClient;
}
