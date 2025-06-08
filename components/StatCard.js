"use client";

import { HiTrendingUp, HiTrendingDown } from "react-icons/hi";

export default function StatCard({ title, value, change, icon, color }) {
  return (
    <div className="flex flex-col p-5 bg-white shadow-md rounded-lg hover:shadow-lg transition-all h-28 w-full">
      <div className="flex items-center justify-between">
        <h4 className="text-gray-500 font-medium text-sm truncate">{title}</h4>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} text-white`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className={`text-sm flex items-center ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? <HiTrendingUp className="mr-1" /> : <HiTrendingDown className="mr-1" />}
          {change.toFixed(2)}%
        </p>
      </div>
    </div>
  );
} 