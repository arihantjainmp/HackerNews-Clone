/**
 * Validates that all required environment variables are present
 * Throws an error if any required variable is missing
 */
export function validateEnv(): void {
  const requiredEnvVars = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'MONGODB_URI', 'PORT'];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate JWT secrets are not default values in production
  if (process.env.NODE_ENV === 'production') {
    const defaultSecrets = [
      'your-super-secret-jwt-key-change-this-in-production',
      'your-super-secret-refresh-token-key-change-this-in-production',
    ];

    if (
      defaultSecrets.includes(process.env.JWT_SECRET || '') ||
      defaultSecrets.includes(process.env.REFRESH_TOKEN_SECRET || '')
    ) {
      throw new Error(
        'Default JWT secrets detected in production environment. ' +
          'Please set secure, unique secrets in your .env file.'
      );
    }
  }
}
