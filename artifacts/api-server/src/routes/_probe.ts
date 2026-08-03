import { db, salaryOffersTable } from "@workspace/db";

async function t(userId: number, company: string, position: string, offered: number, expected: number) {
  const strategy = "s";
  const counterOffer = 12;
  const emails = [{ subject: "s", body: "b" }];
  await db.insert(salaryOffersTable).values({
    userId, company, position, offeredAmount: offered, expectedAmount: expected,
    strategy, counterOffer, negotiationEmails: emails,
    status: "analyzed",
  });
}
void t;
