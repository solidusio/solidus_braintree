class AddBraintreeDeviceDataToOrder < SolidusSupport::Migration[4.2]
  def change
    add_column :spree_orders, :braintree_device_data, :text
  end
end
