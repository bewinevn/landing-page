import * as customerRepository from "../data/customer.repository";
import type { CustomerInput, CustomerRow } from "./customer.types";

/**
 * Guest checkout is phone-number based (no accounts/auth for MVP):
 * a returning phone number reuses the existing customer record and
 * refreshes their delivery details; a new one is created. This is
 * what gives us "purchase history" per customer without an auth system.
 */
export async function findOrCreateByPhone(input: CustomerInput): Promise<CustomerRow> {
  const existing = await customerRepository.findByPhone(input.phone);
  const patch = {
    full_name: input.fullName,
    phone: input.phone,
    email: input.email ?? null,
    address_line: input.addressLine,
    city: input.city,
    note: input.note ?? null,
  };
  if (existing) {
    return customerRepository.update(existing.id, patch);
  }
  return customerRepository.insert(patch);
}

export async function getPurchaseHistory(customerId: string) {
  return customerRepository.findOrderHistory(customerId);
}
