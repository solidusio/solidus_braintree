module VZeroCreditCardConcern
  extend ActiveSupport::Concern
  included do
    attr_accessor :v_zero_supported

    prepend(InstanceMethods)
  end

  module InstanceMethods
    def require_card_numbers?
      super && !self.v_zero_supported
    end
  end
end
