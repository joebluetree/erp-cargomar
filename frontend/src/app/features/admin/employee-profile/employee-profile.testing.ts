import { EmployeeProfile } from './employee-profile.model';

/** A complete profile for specs. */
export const PROFILE: EmployeeProfile = {
  code: 'EMP01',
  name: 'Asha Nair',
  fatherName: 'Ravi Nair',
  spouseName: null,
  maritalStatus: 'MARRIED',
  dateOfBirth: '1990-03-05',
  bank: { accountNo: '123456789', name: 'SBI', branch: 'Kochi', ifsc: 'SBIN0000001' },
  currentAddress: {
    address1: 'House 1',
    address2: 'Road 2',
    address3: 'Area 3',
    city: 'Kochi',
    state: 'KERALA',
    pin: '682001',
    poBox: 'PO 1',
    country: 'INDIA',
  },
  permanentAddress: {
    address1: 'Home 1',
    address2: 'Home 2',
    address3: 'Home 3',
    city: 'Chennai',
    state: 'TAMIL NADU',
    pin: '600001',
    poBox: 'PO 2',
    country: 'INDIA',
  },
  mobile: '9876543210',
  email: 'asha@example.com',
  ids: { aadhaar: '1234 5678 9012', pan: 'ABCDE1234F', pf: 'PF-1', esi: 'ESI-1', uan: 'UAN-1' },
  hasPhoto: false,
};
