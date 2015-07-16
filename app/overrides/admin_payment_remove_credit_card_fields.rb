Deface::Override.new(
  virtual_path: "spree/admin/payments/source_forms/_gateway",
  name: "admin_payment_remove_credit_card_fields",
  remove: "[data-hook=card_number], [data-hook=card_expiration], [data-hook=card_code]"
)
