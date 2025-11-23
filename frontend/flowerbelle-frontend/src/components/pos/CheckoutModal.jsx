import React, { useState } from 'react';
import { X, Wallet, Smartphone, Banknote, Receipt, User, Phone, FileText, AlertCircle, Loader2 } from 'lucide-react';

// --- THEME CONSTANTS ---
const THEME = {
    // Text Colors
    primaryText: "text-[#FF69B4] dark:text-[#FF77A9]",
    headingText: "text-gray-900 dark:text-white",
    subText: "text-gray-500 dark:text-gray-400",
    
    // Gradients
    gradientText: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] bg-clip-text text-transparent",
    gradientBg: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9]",
    
    // Backgrounds
    modalBg: "bg-white dark:bg-[#1e1e1e]",
    
    // Components
    inputBase: "w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-[#FF69B4]/30 bg-white dark:bg-[#1A1A1D] text-gray-900 dark:text-white font-medium focus:border-[#FF69B4] dark:focus:border-[#FF77A9] outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600",
    
    // Buttons
    buttonPrimary: "bg-gradient-to-r from-[#FF69B4] to-[#FF77A9] text-white shadow-lg shadow-[#FF69B4]/30 hover:shadow-[#FF69B4]/50 hover:-translate-y-0.5 transition-all duration-200",
};

const CheckoutModal = ({ isOpen, onClose, cartItems, totals, onCheckout }) => {
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  
  // Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Defined Payment Methods (Removed Card and Bank Transfer)
  const paymentMethods = [
    { value: 'CASH', label: 'Cash', icon: Banknote },
    { value: 'GCASH', label: 'GCash', icon: Smartphone },
    { value: 'PAYMAYA', label: 'PayMaya', icon: Wallet },
  ];

  // Validations
  const isPaymentAmountValid = paymentMethod === 'CASH' ? (amountPaid && parseFloat(amountPaid) >= totals.total) : true;
  const isReferenceValid = paymentMethod !== 'CASH' ? paymentReference.trim() !== '' : true;
  const isCustomerValid = customerName.trim() !== '' && customerPhone.trim() !== '' && notes.trim() !== '';
  const isFormValid = isPaymentAmountValid && isReferenceValid && isCustomerValid;

  const change = amountPaid ? (parseFloat(amountPaid) - totals.total) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsProcessing(true);

    const checkoutData = {
      items: cartItems.map(item => ({
        product: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: 0
      })),
      payment_method: paymentMethod,
      amount_paid: paymentMethod === 'CASH' ? parseFloat(amountPaid) : totals.total,
      payment_reference: paymentReference,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: notes,
      subtotal: totals.subtotal,
      tax: 0,
      total_amount: totals.total,
      discount: 0
    };

    try {
      await onCheckout(checkoutData);
      resetForm();
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setPaymentMethod('CASH');
    setAmountPaid('');
    setPaymentReference('');
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
  };

  const handleQuickAmount = (amount) => setAmountPaid(amount.toString());

  if (!isOpen) return null;

  const labelClass = `flex items-center gap-1.5 text-xs font-bold ${THEME.subText} mb-1.5 uppercase tracking-wide`;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200 dark:border-[#FF69B4]/20 ${THEME.modalBg}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#FF69B4]/10 bg-gray-50/50 dark:bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-white dark:bg-[#1A1A1D] rounded-2xl shadow-sm border border-gray-100 dark:border-[#FF69B4]/20">
                <Receipt className="w-6 h-6 text-[#FF69B4]" />
             </div>
             <div>
                <h3 className={`text-2xl font-extrabold ${THEME.headingText}`}>Checkout</h3>
                <p className="text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> All Fields Required
                </p>
             </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-[#FF69B4] hover:bg-[#FF69B4]/10 rounded-full transition-all"
            disabled={isProcessing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* LEFT COLUMN: Payment Details */}
          <div className="flex-1 p-6 lg:p-8 space-y-8 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
            
            {/* Order Total Card */}
            <div className={`p-6 rounded-2xl border border-gray-200 dark:border-[#FF69B4]/20 flex justify-between items-center shadow-sm bg-gradient-to-br from-white to-gray-50 dark:from-[#1A1A1D] dark:to-[#1A1A1D]`}>
               <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${THEME.subText}`}>Total Amount</p>
                  <p className={`text-xs ${THEME.subText} opacity-70`}>{cartItems.length} items</p>
               </div>
               <div className={`text-4xl font-extrabold ${THEME.gradientText}`}>
                  ₱{totals.total.toFixed(2)}
               </div>
            </div>

            {/* Payment Method Grid */}
            <div>
              <label className={labelClass}>Select Payment Method <span className="text-[#FF69B4]">*</span></label>
              <div className="grid grid-cols-3 gap-4">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      disabled={isProcessing}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#FF69B4] border-[#FF69B4] text-white shadow-lg shadow-[#FF69B4]/30 transform scale-105'
                          : 'bg-white dark:bg-[#1A1A1D] border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-[#FF69B4]/50 dark:hover:border-[#FF69B4]/50'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Logic */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-4 p-6 rounded-2xl bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#FF69B4]/10">
                <div>
                  <label className={labelClass}>Amount Paid <span className="text-[#FF69B4]">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₱</span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      step="0.01"
                      min={totals.total}
                      className={`${THEME.inputBase} pl-10 text-xl font-bold tracking-wide`}
                      placeholder="0.00"
                      required
                      disabled={isProcessing}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[100, 500, 1000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleQuickAmount(amount)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:border-[#FF69B4] hover:text-[#FF69B4] dark:hover:text-[#FF77A9] dark:hover:border-[#FF77A9] transition-all shadow-sm"
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>

                {/* Change Display */}
                {amountPaid && (
                  <div className={`mt-2 p-4 rounded-xl flex justify-between items-center border-2 ${
                    change >= 0 
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' 
                      : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                  }`}>
                    <span className={`text-sm font-bold ${change >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                      {change >= 0 ? 'Change:' : 'Insufficient Amount:'}
                    </span>
                    <span className={`text-2xl font-extrabold ${change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      ₱{Math.abs(change).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Digital Payment Reference */}
            {paymentMethod !== 'CASH' && (
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#1A1A1D] border border-gray-200 dark:border-[#FF69B4]/10">
                <label className={labelClass}>Reference Number <span className="text-[#FF69B4]">*</span></label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className={THEME.inputBase}
                  placeholder="Enter transaction reference ID"
                  required
                  disabled={isProcessing}
                />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Customer Info (REQUIRED) */}
          <div className="w-full lg:w-[400px] bg-gray-50/80 dark:bg-[#151515] p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-[#FF69B4]/10">
            <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
               <h4 className={`text-lg font-bold ${THEME.headingText}`}>Customer Details</h4>
               <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                 Please fill in all customer information to proceed.
               </p>
            </div>
            
            <div>
               <label className={labelClass}>
                  <User size={14} className="text-[#FF69B4]"/> Name <span className="text-[#FF69B4]">*</span>
               </label>
               <input
                 type="text"
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 className={THEME.inputBase}
                 placeholder="Customer Full Name"
                 required
                 disabled={isProcessing}
               />
            </div>

            <div>
               <label className={labelClass}>
                  <Phone size={14} className="text-[#FF69B4]"/> Phone <span className="text-[#FF69B4]">*</span>
               </label>
               <input
                 type="tel"
                 value={customerPhone}
                 onChange={(e) => setCustomerPhone(e.target.value)}
                 className={THEME.inputBase}
                 placeholder="Contact Number"
                 required
                 disabled={isProcessing}
               />
            </div>

            <div className="flex-1">
               <label className={labelClass}>
                  <FileText size={14} className="text-[#FF69B4]"/> Notes <span className="text-[#FF69B4]">*</span>
               </label>
               <textarea
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 rows="4"
                 className={`${THEME.inputBase} resize-none`}
                 placeholder="Add transaction notes (e.g. No special notes)"
                 required
                 disabled={isProcessing}
               />
            </div>

          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-[#FF69B4]/10 bg-white dark:bg-[#1e1e1e] flex gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isProcessing}
            className={`flex-[2] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${THEME.buttonPrimary}`}
          >
            {isProcessing ? (
               <>
                 <Loader2 className="w-5 h-5 animate-spin" />
                 <span>Processing...</span>
               </>
            ) : (
               <>
                 <span>Complete Payment</span>
                 <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-extrabold">₱{totals.total.toFixed(2)}</span>
               </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;