import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Info, DollarSign, Clock, AlertTriangle, Briefcase, FileText, Calendar, Download } from 'lucide-react';

// ATO Tax Coefficients for 2024-25 / 2026-27 (Stage 3 + Medicare Levy phase-ins)
// These coefficients align with the Schedule 1 (Scale 2 - Claiming TFT) withholding rates
const calculateWeeklyTax = (weeklyGross, claimTFT) => {
  const x = Math.floor(weeklyGross) + 0.99;
  let a = 0, b = 0;

  if (claimTFT) {
    // Scale 2: Claiming Tax-Free Threshold
    if (x < 362) { a = 0.0000; b = 0.0000; }
    else if (x < 538) { a = 0.1500; b = 54.3462; }
    else if (x < 673) { a = 0.2500; b = 108.2135; }
    else if (x < 721) { a = 0.1700; b = 54.3473; }
    else if (x < 865) { a = 0.1790; b = 60.8377; }
    else if (x < 1282) { a = 0.3227; b = 185.1935; }
    else if (x < 1337) { a = 0.3200; b = 181.7319; }
    else { a = 0.4700; b = 382.2935; }
  } else {
    // Scale 1: No Tax-Free Threshold (Second Job / Foreign Resident approximation)
    if (x < 865) { a = 0.3200; b = 0.0000; }
    else if (x < 1282) { a = 0.3477; b = 23.9615; }
    else if (x < 1337) { a = 0.3450; b = 20.5000; }
    else { a = 0.4700; b = 187.6346; }
  }

  const weeklyTax = (a * x) - b;
  return Math.max(0, Math.round(weeklyTax)); // ATO rounds to nearest whole dollar
};

export default function ATOCalculator() {
  const [frequency, setFrequency] = useState('Fortnightly');
  const [payPeriodStart, setPayPeriodStart] = useState('2026-06-29');
  const [payPeriodEnd, setPayPeriodEnd] = useState('2026-07-12');
  const [jobs, setJobs] = useState([
    {
      id: 1,
      name: 'Cleaning Job (Primary)',
      hasTFT: true,
      baseRate: 25.85,
      hourlyAllowance: 3.88, // e.g., 15% part-time allowance
      fixedAllowance: 0,
      normalHours: 52.35,
      overtime15Hours: 2,
      overtime20Hours: 1.15
    }
  ]);

  const addJob = () => {
    setJobs([
      ...jobs,
      {
        id: Date.now(),
        name: `Secondary Job`,
        hasTFT: false, // Second jobs typically don't claim TFT
        baseRate: 25.00,
        hourlyAllowance: 0,
        fixedAllowance: 0,
        normalHours: 0,
        overtime15Hours: 0,
        overtime20Hours: 0
      }
    ]);
  };

  const removeJob = (id) => {
    setJobs(jobs.filter(job => job.id !== id));
  };

  const updateJob = (id, field, value) => {
    setJobs(jobs.map(job => {
      if (job.id === id) {
        // Enforce only one TFT if toggling TFT
        if (field === 'hasTFT' && value === true) {
           // Warning: In reality, users can claim it on multiple, but it usually results in a tax bill.
           // We will allow it but show a warning in the UI.
        }
        return { ...job, [field]: value };
      }
      return job;
    }));
  };

  const tftCount = jobs.filter(j => j.hasTFT).length;
  const multipleTFTWarning = tftCount > 1;

  let totalGross = 0;
  let totalTax = 0;
  let totalSuper = 0;
  let grandTotalHours = 0;

  const jobResults = jobs.map(job => {
    // 1. Calculate Gross Earnings for the job
    const basePay = (parseFloat(job.baseRate) || 0) * (parseFloat(job.normalHours) || 0);
    const ot15Pay = (parseFloat(job.baseRate) || 0) * 1.5 * (parseFloat(job.overtime15Hours) || 0);
    const ot20Pay = (parseFloat(job.baseRate) || 0) * 2.0 * (parseFloat(job.overtime20Hours) || 0);
    const hourlyAllPay = (parseFloat(job.hourlyAllowance) || 0) * (parseFloat(job.normalHours) || 0);
    const fixedAllPay = (parseFloat(job.fixedAllowance) || 0);
    
    const gross = basePay + ot15Pay + ot20Pay + hourlyAllPay + fixedAllPay;
    totalGross += gross;

    // Calculate total hours
    const totalHours = (parseFloat(job.normalHours) || 0) + (parseFloat(job.overtime15Hours) || 0) + (parseFloat(job.overtime20Hours) || 0);
    grandTotalHours += totalHours;

    // Calculate Superannuation (12% of Ordinary Time Earnings - OTE)
    // Overtime is generally excluded from OTE
    const ote = basePay + hourlyAllPay + fixedAllPay;
    const superAmount = ote * 0.12; 
    totalSuper += superAmount;

    // 2. Calculate Tax for the job based on frequency
    // Convert to weekly equivalent for the ATO formula
    const weeklyEquivalent = frequency === 'Fortnightly' ? gross / 2 : gross;
    const weeklyTax = calculateWeeklyTax(weeklyEquivalent, job.hasTFT);
    const tax = frequency === 'Fortnightly' ? weeklyTax * 2 : weeklyTax;
    
    totalTax += tax;

    const net = gross - tax;

    return { ...job, gross, tax, net, basePay, ot15Pay, ot20Pay, hourlyAllPay, fixedAllPay, totalHours, superAmount };
  });

  const totalNet = totalGross - totalTax;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800 print:bg-white">
      <div className="max-w-5xl mx-auto space-y-6 print:hidden">
        
        {/* Header Section */}
        <header className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-700">
              <Calculator className="w-7 h-7" />
              ATO PAYG Estimator
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Calculate your take-home pay across single or multiple jobs.</p>
            
            <div className="flex items-center gap-3 mt-4 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={payPeriodStart} 
                  onChange={(e) => setPayPeriodStart(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-400 outline-none"
                />
                <span>to</span>
                <input 
                  type="date" 
                  value={payPeriodEnd} 
                  onChange={(e) => setPayPeriodEnd(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <button 
                onClick={() => setFrequency('Weekly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${frequency === 'Weekly' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setFrequency('Fortnightly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${frequency === 'Fortnightly' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Fortnightly
              </button>
            </div>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export PDF Payslip
            </button>
          </div>
        </header>

        {/* Warnings */}
        {multipleTFTWarning && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Warning:</strong> You have claimed the Tax-Free Threshold on multiple jobs. The ATO strongly recommends claiming this on <strong>only one job</strong> to avoid a large tax debt at the end of the financial year.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-6">
            {jobResults.map((job, index) => (
              <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-3 w-full max-w-sm">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    <input 
                      type="text" 
                      value={job.name}
                      onChange={(e) => updateJob(job.id, 'name', e.target.value)}
                      className="bg-slate-700 text-white border-none rounded px-2 py-1 flex-1 text-sm font-medium focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    />
                  </div>
                  {jobs.length > 1 && (
                    <button onClick={() => removeJob(job.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Tax-Free Threshold</h4>
                      <p className="text-xs text-slate-500">Claim the first $18,200 tax-free?</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={job.hasTFT} 
                        onChange={(e) => updateJob(job.id, 'hasTFT', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-3 text-sm font-medium text-slate-700">{job.hasTFT ? 'Yes' : 'No'}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Hourly Rate</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.01"
                          value={job.baseRate}
                          onChange={(e) => updateJob(job.id, 'baseRate', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Normal Hours</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.1"
                          value={job.normalHours}
                          onChange={(e) => updateJob(job.id, 'normalHours', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overtime (1.5x) Hrs</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.1"
                          value={job.overtime15Hours}
                          onChange={(e) => updateJob(job.id, 'overtime15Hours', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overtime (2.0x) Hrs</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.1"
                          value={job.overtime20Hours}
                          onChange={(e) => updateJob(job.id, 'overtime20Hours', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        Hourly Allowance <span title="Applies to normal hours (e.g. 15% Part Time Loading)"><Info className="w-3 h-3"/></span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.01"
                          value={job.hourlyAllowance}
                          onChange={(e) => updateJob(job.id, 'hourlyAllowance', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fixed Allowance ({frequency})</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="number" step="0.01"
                          value={job.fixedAllowance}
                          onChange={(e) => updateJob(job.id, 'fixedAllowance', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Individual Job Breakdown */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap gap-4 justify-between items-center">
                    <div>
                      <p className="text-xs text-slate-500">Total Hours</p>
                      <p className="font-bold text-slate-800">{job.totalHours.toFixed(2)} hrs</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Gross Pay</p>
                      <p className="font-bold text-slate-800">${job.gross.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estimated Tax</p>
                      <p className="font-bold text-red-500">-${job.tax.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Net Pay</p>
                      <p className="font-bold text-emerald-600 text-lg">${job.net.toFixed(2)}</p>
                    </div>
                    <div className="w-full pt-2 mt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Employer Superannuation (12%): <span className="font-semibold text-slate-700">${job.superAmount.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            ))}

            <button 
              onClick={addJob}
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-500 font-semibold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Another Job
            </button>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6 text-indigo-700">
                <FileText className="w-6 h-6" />
                <h2 className="text-xl font-bold">Total Summary</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Frequency</span>
                  <span className="text-slate-900 font-bold">{frequency}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Hours</span>
                  <span className="text-slate-900 font-bold">{grandTotalHours.toFixed(2)} hrs</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Gross</span>
                  <span className="text-slate-900 font-bold">${totalGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total PAYG Tax</span>
                  <span className="text-red-500 font-bold">-${totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Superannuation (12%)</span>
                  <span className="text-slate-900 font-bold">${totalSuper.toFixed(2)}</span>
                </div>
                
                <div className="pt-4 pb-2">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Net Pay</span>
                  <p className="text-4xl font-extrabold text-emerald-600 mt-1">${totalNet.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed">
                <strong>Disclaimer:</strong> This calculator provides an estimate based on the standard ATO Stage 3 PAYG withholding tax tables for Australian residents. Actual deductions made by your employer's payroll software may vary slightly by a few dollars depending on specific accounting software rounding methods or HECS/HELP debts (not included here).
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* --- PRINT / PDF VIEW --- */}
      <div className="hidden print:block p-8 bg-white text-black min-h-screen">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wider">Pay Advice</h1>
            <p className="text-slate-600 mt-1">Generated by ATO PAYG Estimator</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Pay Period</p>
            <p>{new Date(payPeriodStart).toLocaleDateString()} - {new Date(payPeriodEnd).toLocaleDateString()}</p>
            <p className="text-sm text-slate-500 mt-1">Frequency: {frequency}</p>
          </div>
        </div>

        {jobResults.map((job) => (
          <div key={`print-${job.id}`} className="mb-8">
            <h2 className="text-xl font-bold mb-4 bg-slate-100 p-2 rounded">{job.name}</h2>
            
            <table className="w-full mb-4 text-sm text-left">
              <thead className="border-b border-slate-300">
                <tr>
                  <th className="py-2">Description</th>
                  <th className="py-2">Hours/Qty</th>
                  <th className="py-2">Rate</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="border-b border-slate-300">
                {job.normalHours > 0 && (
                  <tr>
                    <td className="py-1">Normal Hours</td>
                    <td className="py-1">{job.normalHours}</td>
                    <td className="py-1">${parseFloat(job.baseRate).toFixed(2)}</td>
                    <td className="py-1 text-right">${job.basePay.toFixed(2)}</td>
                  </tr>
                )}
                {job.overtime15Hours > 0 && (
                  <tr>
                    <td className="py-1">Overtime (1.5x)</td>
                    <td className="py-1">{job.overtime15Hours}</td>
                    <td className="py-1">${(parseFloat(job.baseRate) * 1.5).toFixed(2)}</td>
                    <td className="py-1 text-right">${job.ot15Pay.toFixed(2)}</td>
                  </tr>
                )}
                {job.overtime20Hours > 0 && (
                  <tr>
                    <td className="py-1">Overtime (2.0x)</td>
                    <td className="py-1">{job.overtime20Hours}</td>
                    <td className="py-1">${(parseFloat(job.baseRate) * 2.0).toFixed(2)}</td>
                    <td className="py-1 text-right">${job.ot20Pay.toFixed(2)}</td>
                  </tr>
                )}
                {job.hourlyAllPay > 0 && (
                  <tr>
                    <td className="py-1">Hourly Allowance</td>
                    <td className="py-1">{job.normalHours}</td>
                    <td className="py-1">${parseFloat(job.hourlyAllowance).toFixed(2)}</td>
                    <td className="py-1 text-right">${job.hourlyAllPay.toFixed(2)}</td>
                  </tr>
                )}
                {job.fixedAllPay > 0 && (
                  <tr>
                    <td className="py-1">Fixed Allowance</td>
                    <td className="py-1">-</td>
                    <td className="py-1">-</td>
                    <td className="py-1 text-right">${job.fixedAllPay.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end gap-12 text-sm">
              <div className="space-y-1 text-right">
                <p>Gross Pay:</p>
                <p>PAYG Tax:</p>
                <p className="font-bold text-base mt-2">Net Pay:</p>
              </div>
              <div className="space-y-1 text-right">
                <p>${job.gross.toFixed(2)}</p>
                <p className="text-red-600">-${job.tax.toFixed(2)}</p>
                <p className="font-bold text-base mt-2">${job.net.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded">
              <p className="text-sm font-semibold">Employer Superannuation Contribution</p>
              <p className="text-sm text-slate-600">12% of Ordinary Time Earnings (OTE): <strong>${job.superAmount.toFixed(2)}</strong></p>
            </div>
          </div>
        ))}

        {jobs.length > 1 && (
          <div className="mt-8 border-t-2 border-slate-800 pt-4">
            <h2 className="text-xl font-bold mb-4">Total Summary (All Jobs)</h2>
            <div className="flex justify-between max-w-sm">
              <div className="space-y-2 font-medium">
                <p>Total Hours:</p>
                <p>Total Gross:</p>
                <p>Total Tax:</p>
                <p>Total Super (SG):</p>
                <p className="text-lg font-bold mt-2">Total Net Pay:</p>
              </div>
              <div className="space-y-2 text-right">
                <p>{grandTotalHours.toFixed(2)}</p>
                <p>${totalGross.toFixed(2)}</p>
                <p className="text-red-600">-${totalTax.toFixed(2)}</p>
                <p>${totalSuper.toFixed(2)}</p>
                <p className="text-lg font-bold mt-2">${totalNet.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-12 text-center text-xs text-slate-400">
          <p>This is an estimated calculation and not an official payslip provided by your employer.</p>
        </div>
      </div>
    </div>
  );
}