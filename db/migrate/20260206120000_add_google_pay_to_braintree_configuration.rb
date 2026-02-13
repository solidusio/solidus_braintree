class AddGooglePayToBraintreeConfiguration < ActiveRecord::Migration[5.0]
  def change
    add_column :solidus_paypal_braintree_configurations, :google_pay, :boolean, null: false, default: false
  end
end
