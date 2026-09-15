export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address_line: string;
  city: string;
  note: string | null;
}

export interface CustomerInput {
  fullName: string;
  phone: string;
  email?: string;
  addressLine: string;
  city: string;
  note?: string;
}
