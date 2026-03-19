import { ensureSetup, resetSetupState, parseMaxFeeRate } from '../../setup/auto-setup';
import { BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE, REFERRAL_CODE } from '../../config/constants';

const mockGetMaxBuilderFee = jest.fn();
const mockApproveBuilderFee = jest.fn();
const mockGetReferral = jest.fn();
const mockSetReferrer = jest.fn();

const mockClient = {
  getMaxBuilderFee: mockGetMaxBuilderFee,
  approveBuilderFee: mockApproveBuilderFee,
  getReferral: mockGetReferral,
  setReferrer: mockSetReferrer,
} as any;

beforeEach(() => {
  resetSetupState();
  jest.clearAllMocks();
});

describe('ensureSetup', () => {
  it('approves builder fee when not yet approved', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(0);
    mockApproveBuilderFee.mockResolvedValue({ status: 'ok' });
    mockGetReferral.mockResolvedValue({ referredBy: 'someone' });

    await ensureSetup(mockClient);

    expect(mockGetMaxBuilderFee).toHaveBeenCalledWith(BUILDER_ADDRESS);
    expect(mockApproveBuilderFee).toHaveBeenCalledWith(BUILDER_ADDRESS, BUILDER_MAX_FEE_RATE);
  });

  it('skips approval when fee is already approved', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(BUILDER_MAX_FEE_RATE);
    mockGetReferral.mockResolvedValue({ referredBy: 'someone' });

    await ensureSetup(mockClient);

    expect(mockGetMaxBuilderFee).toHaveBeenCalled();
    expect(mockApproveBuilderFee).not.toHaveBeenCalled();
  });

  it('runs setup at most once per process', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(BUILDER_MAX_FEE_RATE);
    mockGetReferral.mockResolvedValue({ referredBy: 'someone' });

    await ensureSetup(mockClient);
    await ensureSetup(mockClient);
    await ensureSetup(mockClient);

    expect(mockGetMaxBuilderFee).toHaveBeenCalledTimes(1);
    expect(mockGetReferral).toHaveBeenCalledTimes(1);
  });

  it('does not throw on network failure', async () => {
    mockGetMaxBuilderFee.mockRejectedValue(new Error('network error'));
    mockGetReferral.mockRejectedValue(new Error('network error'));

    await expect(ensureSetup(mockClient)).resolves.toBeUndefined();
  });

  it('registers referral when user has no referrer', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(BUILDER_MAX_FEE_RATE);
    mockGetReferral.mockResolvedValue({ referredBy: null });
    mockSetReferrer.mockResolvedValue({ status: 'ok' });

    await ensureSetup(mockClient);

    expect(mockSetReferrer).toHaveBeenCalledWith(REFERRAL_CODE);
  });

  it('skips referral when user already has a referrer', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(BUILDER_MAX_FEE_RATE);
    mockGetReferral.mockResolvedValue({ referredBy: 'existing-code' });

    await ensureSetup(mockClient);

    expect(mockSetReferrer).not.toHaveBeenCalled();
  });

  it('re-runs setup after state reset', async () => {
    mockGetMaxBuilderFee.mockResolvedValue(BUILDER_MAX_FEE_RATE);
    mockGetReferral.mockResolvedValue({ referredBy: 'someone' });

    await ensureSetup(mockClient);
    expect(mockGetMaxBuilderFee).toHaveBeenCalledTimes(1);

    resetSetupState();
    await ensureSetup(mockClient);
    expect(mockGetMaxBuilderFee).toHaveBeenCalledTimes(2);
  });
});

describe('parseMaxFeeRate', () => {
  it('parses percentage string', () => {
    expect(parseMaxFeeRate('0.1%')).toBe(0.001);
  });

  it('parses decimal number', () => {
    expect(parseMaxFeeRate(0.001)).toBe(0.001);
  });

  it('parses decimal string', () => {
    expect(parseMaxFeeRate('0.001')).toBe(0.001);
  });

  it('returns 0 for unparseable values', () => {
    expect(parseMaxFeeRate(null)).toBe(0);
    expect(parseMaxFeeRate(undefined)).toBe(0);
    expect(parseMaxFeeRate('abc')).toBe(0);
  });
});
