module SolidusBraintree
  module UseDataFieldConcern
    extend ActiveSupport::Concern
    included do
      prepend(InstanceMethods)
    end

    module InstanceMethods

      def email
        data["email"]
      end

      def display_number
        cc_type == 'paypal' ? email : super
      end

      def data
        super.is_a?(String) ? JSON.parse(super) : super
      end
    end
  end
end
