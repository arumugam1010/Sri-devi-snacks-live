import React, { useState } from 'react';
import { Package, Receipt } from 'lucide-react';
import BakeryProducts from './BakeryProducts';
import BakeryBilling from './BakeryBilling';

export default function BakeryLayout() {
  const [activeTab, setActiveTab] = useState<'billing' | 'products'>('billing');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header / Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex space-x-6 shrink-0">
        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center pb-2 border-b-2 font-medium transition-colors ${
            activeTab === 'billing' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Receipt className="w-5 h-5 mr-2" />
          Bakery Billing
        </button>
        
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center pb-2 border-b-2 font-medium transition-colors ${
            activeTab === 'products' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Package className="w-5 h-5 mr-2" />
          Bakery Products
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {activeTab === 'billing' && <BakeryBilling />}
        {activeTab === 'products' && <BakeryProducts />}
      </div>
    </div>
  );
}
