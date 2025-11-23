import React, { useState } from 'react';
import CheckoutModal from '../CheckoutModal/CheckoutModal';
import './PointOfSale.css'; 

function PointOfSale() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mockCartTotal = 5000.00; // Mock total from your latest screenshot

  const handleOpenModal = () => {
    if (mockCartTotal > 0) {
      setIsModalOpen(true);
    } else {
      console.log("Cart is empty. Cannot proceed to checkout.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // In a production app, successful transactions would trigger cart clearing here
  };

  return (
    <div className="pos-container">
      <h1>Flowerbelle Point of Sale</h1>
      
      <div className="product-grid">
        {/* Placeholder for product display */}
        <p>Product List / Search Area</p>
      </div>

      <div className="cart-sidebar">
        <h2>Cart (1)</h2>
        <p>Subtotal: <span>₱{mockCartTotal.toFixed(2)}</span></p>
        <p>Total: <span>₱{mockCartTotal.toFixed(2)}</span></p>
        
        <button 
          className="proceed-btn"
          onClick={handleOpenModal}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#C02C69', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Proceed to Checkout
        </button>
      </div>

      {isModalOpen && (
        <CheckoutModal 
          totalAmount={mockCartTotal} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}

export default PointOfSale;