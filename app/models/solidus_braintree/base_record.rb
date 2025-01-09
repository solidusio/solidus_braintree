# frozen_string_literal: true

module SolidusBraintree
  def self.table_name_prefix
    'solidus_paypal_braintree_'
  end

  class BaseRecord < ::Spree::Base
    self.abstract_class = true
  end
end
