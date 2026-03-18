import { validateAddress } from '../../utils/validate';
import { VALID_ADDRESS, VALID_ADDRESS_LOWERCASE, INVALID_ADDRESS, SHORT_ADDRESS, EMPTY_ADDRESS } from '../fixtures';

describe('validateAddress', () => {
  it('accepts valid checksummed address', () => {
    expect(() => validateAddress(VALID_ADDRESS, 'destination')).not.toThrow();
  });

  it('accepts valid lowercase address', () => {
    expect(() => validateAddress(VALID_ADDRESS_LOWERCASE, 'destination')).not.toThrow();
  });

  it('accepts zero address', () => {
    expect(() =>
      validateAddress('0x0000000000000000000000000000000000000000', 'vault'),
    ).not.toThrow();
  });

  it('throws on invalid address', () => {
    expect(() => validateAddress(INVALID_ADDRESS, 'destination')).toThrow(
      'Invalid destination: "0xinvalid" is not a valid Ethereum address.',
    );
  });

  it('throws on short address', () => {
    expect(() => validateAddress(SHORT_ADDRESS, 'vault')).toThrow(
      'Invalid vault: "0x1234" is not a valid Ethereum address.',
    );
  });

  it('throws on empty string', () => {
    expect(() => validateAddress(EMPTY_ADDRESS, 'agent address')).toThrow(
      'Invalid agent address: "" is not a valid Ethereum address.',
    );
  });

  it('throws on random string', () => {
    expect(() => validateAddress('hello-world', 'destination')).toThrow(
      'is not a valid Ethereum address',
    );
  });

  it('includes field name in error message', () => {
    expect(() => validateAddress('bad', 'my-field')).toThrow('Invalid my-field');
  });
});
