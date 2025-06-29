// Blacklist of keywords for non-food lines/items in receipts
// Extend as needed for more robust filtering
export const NON_FOOD_KEYWORDS = [
  'total', 'change', 'vat', 'balance', 'due', 'cardholder', 'rate', 'gross', 'net', 'summary',
  'tax', 'amount', 'payment', 'cash', 'credit', 'debit', 'visa', 'mastercard', 'subtotal',
  'tip', 'service', 'fee', 'rounding', 'discount', 'loyalty', 'points', 'card', 'transaction',
  'ref', 'auth', 'approved', 'declined', 'terminal', 'receipt', 'invoice', 'number', 'date',
  'time', 'store', 'merchant', 'address', 'phone', 'thank', 'you', 'visit', 'customer',
  'operator', 'clerk', 'cashier', 'register', 'item count', 'items', 'qty', 'unit', 'price',
  'total due', 'total paid', 'change due', 'balance due', 'amount due', 'amount paid',
  'grand total', 'final total', 'final amount', 'total amount', 'total tax', 'total vat',
  'total change', 'total cash', 'total card', 'total credit', 'total debit', 'total points',
  'total discount', 'total fee', 'total service', 'total tip', 'total rounding', 'total loyalty',
  'total payment', 'total transaction', 'total invoice', 'total receipt', 'total number',
  'total date', 'total time', 'total store', 'total merchant', 'total address', 'total phone',
  'total customer', 'total operator', 'total clerk', 'total cashier', 'total register',
  'total item', 'total items', 'total qty', 'total unit', 'total price',
]; 