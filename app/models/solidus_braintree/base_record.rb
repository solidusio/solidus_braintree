# frozen_string_literal: true

module SolidusBraintree
  class BaseRecord < ::Spree::Base
    self.abstract_class = true
    self.table_name_prefix = 'solidus_paypal_braintree_'
  end
end
