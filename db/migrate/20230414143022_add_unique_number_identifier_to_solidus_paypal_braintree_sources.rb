class AddUniqueNumberIdentifierToSolidusPaypalBraintreeSources < ActiveRecord::Migration[5.0]
  def change
    add_column :solidus_paypal_braintree_sources, :unique_number_identifier, :string
    add_column :solidus_paypal_braintree_sources, :last_4, :string
  end
end
