Spree::PermittedAttributes.singleton_class.prepend SolidusBraintree::PermittedAttributesConcern
Spree::PermittedAttributes.checkout_attributes << :device_data
