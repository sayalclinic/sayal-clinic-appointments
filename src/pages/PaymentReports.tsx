import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Download, DollarSign, Search, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  payment_id: string;
  patient_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  amount: number;
  payment_method: string;
  tests_done: string;
  created_at: string;
}

export const PaymentReports = () => {
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [filteredData, setFilteredData] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAmounts, setShowAmounts] = useState(false);
  const [accessCode, setAccessCode] = useState('');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  useEffect(() => {
    filterData();
  }, [paymentData, selectedMonth, selectedYear, searchTerm]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          tests_done,
          created_at,
          appointments (
            appointment_date,
            appointment_time,
            patients (
              name
            ),
            profiles!appointments_doctor_id_fkey (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = payments?.map(payment => ({
        payment_id: payment.id,
        patient_name: payment.appointments?.patients?.name || 'Unknown',
        doctor_name: payment.appointments?.profiles?.name || 'Unknown',
        appointment_date: payment.appointments?.appointment_date || '',
        appointment_time: payment.appointments?.appointment_time || '',
        amount: payment.amount,
        payment_method: payment.payment_method,
        tests_done: payment.tests_done || 'None',
        created_at: payment.created_at,
      })) || [];

      setPaymentData(formattedData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = paymentData.filter(item => {
      const itemDate = new Date(item.created_at);
      const matchesDate = itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      const matchesSearch = searchTerm === '' || 
        item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.payment_method.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesDate && matchesSearch;
    });

    setFilteredData(filtered);
  };

  const checkAccessCode = () => {
    if (accessCode === 'creative10') {
      setShowAmounts(true);
      setAccessCode('');
    } else {
      alert('Invalid access code');
      setAccessCode('');
    }
  };

  const getTotalRevenue = () => {
    return filteredData.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPaymentMethodBreakdown = () => {
    const breakdown = filteredData.reduce((acc, payment) => {
      acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);
    return breakdown;
  };

  const exportToCSV = () => {
    const headers = [
      'Payment ID',
      'Patient Name',
      'Doctor Name',
      'Appointment Date',
      'Appointment Time',
      ...(showAmounts ? ['Amount', 'Payment Method'] : ['Payment Method']),
      'Tests Done',
      'Payment Date'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        row.payment_id,
        row.patient_name,
        row.doctor_name,
        row.appointment_date,
        row.appointment_time,
        ...(showAmounts ? [row.amount, row.payment_method] : [row.payment_method]),
        `"${row.tests_done}"`,
        format(new Date(row.created_at), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-reports-${selectedYear}-${selectedMonth + 1}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.close()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-medical-dark">Payment Reports</h1>
              <p className="text-muted-foreground">Financial transactions and payment history</p>
            </div>
          </div>
          <Button onClick={exportToCSV} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary Cards */}
        {showAmounts && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  ${getTotalRevenue().toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {months[selectedMonth]} {selectedYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {filteredData.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
                <DollarSign className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  ${filteredData.length > 0 ? (getTotalRevenue() / filteredData.length).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Month</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Year</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search by patient, doctor, or method..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">View Amounts</label>
                {!showAmounts ? (
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      placeholder="Enter code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && checkAccessCode()}
                    />
                    <Button size="sm" onClick={checkAccessCode}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowAmounts(false)}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Amounts
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        {showAmounts && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(getPaymentMethodBreakdown()).map(([method, amount]) => (
                  <div key={method} className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-lg font-bold">${amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground capitalize">{method}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} payments for {months[selectedMonth]} {selectedYear}
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading payment reports...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No payments found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Payment ID</th>
                      <th className="text-left p-4 font-medium">Patient</th>
                      <th className="text-left p-4 font-medium">Doctor</th>
                      <th className="text-left p-4 font-medium">Appointment</th>
                      {showAmounts && <th className="text-left p-4 font-medium">Amount</th>}
                      <th className="text-left p-4 font-medium">Method</th>
                      <th className="text-left p-4 font-medium">Tests Done</th>
                      <th className="text-left p-4 font-medium">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-mono text-sm">{row.payment_id.slice(-8)}</td>
                        <td className="p-4 font-medium">{row.patient_name}</td>
                        <td className="p-4 text-sm">Dr. {row.doctor_name}</td>
                        <td className="p-4 text-sm">
                          <div>
                            <div>{format(new Date(row.appointment_date), 'MMM dd, yyyy')}</div>
                            <div className="text-muted-foreground">{row.appointment_time}</div>
                          </div>
                        </td>
                        {showAmounts && (
                          <td className="p-4 font-bold text-success">
                            ${row.amount.toFixed(2)}
                          </td>
                        )}
                        <td className="p-4">
                          <Badge variant="outline" className="capitalize">
                            {row.payment_method}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">{row.tests_done}</td>
                        <td className="p-4 text-sm">
                          {format(new Date(row.created_at), 'MMM dd, yyyy HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};