class AddNotNullConstraintToSourcesPaymentType < SolidusSupport::Migration[4.2]
  class SolidusPaypalBraintreeSource < ActiveRecord::Base
  end

  def change
    reversible do |dir|
      dir.up do
        SolidusPaypalBraintreeSource.where(payment_type: nil).
          update_all(payment_type: 'CreditCard')
      end
    end
    change_column_null(:solidus_paypal_braintree_sources, :payment_type, false)
  end
end
