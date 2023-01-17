class RenameSolidusPaypalBraintreeSourceType < ActiveRecord::Migration[6.1]
  # This is based on the best practices recommended in
  # https://github.com/ankane/strong_migrations#backfilling-data on how to
  # safely update a table.

  disable_ddl_transaction!

  def up
    Spree::Payment.unscoped
      .where(source_type: 'SolidusPaypalBraintree::Source').in_batches do |relation|
        relation.update_all("source_type = 'SolidusBraintree::Source'")
        sleep(0.01)
      end

    Spree::WalletPaymentSource.unscoped
      .where(payment_source_type: 'SolidusPaypalBraintree::Source').in_batches do |relation|
        relation.update_all("payment_source_type = 'SolidusBraintree::Source'")
        sleep(0.01)
      end

    Spree::PaymentMethod.unscoped
      .where('type = ?', 'SolidusPaypalBraintree::Gateway').in_batches do |relation|
        relation.update_all("type = 'SolidusBraintree::Gateway'")
        sleep(0.01)
      end
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
