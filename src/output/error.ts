export class ActionableError extends Error {
  suggestedCommand?: string;

  constructor(message: string, suggestedCommand?: string) {
    super(message);
    this.name = 'ActionableError';
    this.suggestedCommand = suggestedCommand;
  }
}

export function handleError(err: unknown): void {
  if (err instanceof ActionableError) {
    console.error(`\nError: ${err.message}`);
    if (err.suggestedCommand) {
      console.error(`\nTry: ${err.suggestedCommand}`);
    }
    process.exit(1);
  }

  if (err instanceof Error) {
    let message = err.message;

    // Truncate long messages
    if (message.length > 500) {
      message = message.slice(0, 500) + '...';
    }

    // Suggest auth for auth-related errors
    if (/unauthorized|forbidden|not authenticated/i.test(message)) {
      console.error(`\nError: ${message}`);
      console.error(`\nTry: hyperliquid-cli config init`);
      process.exit(1);
    }

    console.error(`\nError: ${message}`);
    process.exit(1);
  }

  console.error(`\nUnknown error:`, err);
  process.exit(1);
}

export function requireConfig(
  value: string | undefined,
  name: string,
  setCommand: string,
): asserts value is string {
  if (!value) {
    throw new ActionableError(
      `${name} is not configured.`,
      `hyperliquid-cli config set ${setCommand}`,
    );
  }
}
