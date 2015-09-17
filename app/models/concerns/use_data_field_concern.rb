module UseDataFieldConcern
  extend ActiveSupport::Concern
  included do
    prepend(InstanceMethods)
  end

  module InstanceMethods

    def email
      details["email"]
    end

    def display_number
      cc_type == 'paypal' ? email : super
    end

    def details
      @details ||= (data.is_a?(String) ? JSON.parse(data) : data)
    end
  end
end
