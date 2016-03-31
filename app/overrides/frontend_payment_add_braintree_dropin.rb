Deface::Override.new(
  virtual_path: "spree/checkout/_payment",
  name: "frontend_payment_add_braintree_dropin",
  insert_bottom: "ul#payment-methods",
  text: %Q{
    <%= javascript_include_tag "spree/frontend/braintree/solidus_braintree", "data-turbolinks-track" => true, "crossorigin" => "anonymous" %>
    <div id="braintree-dropin"></div>
    <input type="hidden" id="payment_method_nonce" name="order[payments_attributes][][payment_method_nonce]">
  }
)
