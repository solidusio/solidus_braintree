# frozen_string_literal: true

module SolidusBraintree
  module SpreeUserPatch
    def self.prepended(base)
      base.has_one :braintree_customer, class_name: 'SolidusBraintree::Customer', inverse_of: :user
    end

    ::Spree.user_class.prepend self
  end
end
