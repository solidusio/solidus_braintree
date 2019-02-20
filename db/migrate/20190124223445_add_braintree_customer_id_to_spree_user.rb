class AddBraintreeCustomerIdToSpreeUser < ActiveRecord::Migration[5.1]
  def change
    add_column :spree_users, :braintree_customer_id, :string, index: true
  end
end
