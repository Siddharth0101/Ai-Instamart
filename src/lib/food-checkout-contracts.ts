import { z } from "zod";
import { AddressSchema, CartSchema, PaymentSchema } from "./contracts";

export const FoodCheckoutSchema = z.strictObject({
  cart: CartSchema,
  address: AddressSchema,
  restaurant: z.strictObject({ id: z.string(), name: z.string() }),
  payments: z.array(PaymentSchema),
  paymentMethodId: z.string().nullable(),
});
export type FoodCheckout = z.infer<typeof FoodCheckoutSchema>;
