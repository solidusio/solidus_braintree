class AddDataToCreditCard < ActiveRecord::Migration
  def change
    current_adapter_name    = ActiveRecord::Base.connection.adapter_name
    if current_adapter_name != "Mysql2"
      add_column :spree_credit_cards, :data, :json
    else
      current_adapter_version = Gem::Version.new(ActiveRecord::Base.connection.send(:version).join('.'))
      if current_adapter_version >= Gem::Version::new('5.7.8') # supports_json?()
        add_column :spree_credit_cards, :data, :json
      else
        add_column :spree_credit_cards, :data, :text
      end
    end
  end
end
