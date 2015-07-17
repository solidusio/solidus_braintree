module PermittedAttributesConcern
  def payment_attributes
    super << :payment_method_nonce
  end

  def source_attributes
    super << :v_zero_supported
  end
end
