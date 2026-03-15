export type OutputFormat = 'json' | 'table';

export function getOutputFormat(options: { output?: string }): OutputFormat {
  return options.output === 'json' ? 'json' : 'table';
}

export function output(data: unknown, format: OutputFormat = 'table'): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No data');
      return;
    }
    console.table(data);
    return;
  }

  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
    for (const [key, value] of entries) {
      const displayValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);
      console.log(`  ${key.padEnd(maxKeyLen + 2)} ${displayValue}`);
    }
    return;
  }

  console.log(String(data));
}
