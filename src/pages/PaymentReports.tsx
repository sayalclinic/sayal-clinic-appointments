import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Download, IndianRupee, Search, Eye, EyeOff, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [showAmounts, setShowAmounts] = useState(false);
  const [accessCode, setAccessCode] = useState("");

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
        .from("payments")
        .select(
          `
          id,
          appointment_fee,
          test_payments,
          payment_method,
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
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData =
        payments?.map((payment) => {
          const appointmentFee = Number(payment.appointment_fee ?? 0);
          const testPaymentsArray = payment.test_payments as any;
          const testPaymentsTotal = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((sum: number, test: any) => sum + Number(test.amount ?? 0), 0)
            : 0;
          const testsDone = Array.isArray(testPaymentsArray) && testPaymentsArray.length > 0
            ? testPaymentsArray.map((t: any) => t.test_name).join(', ')
            : 'None';
          return {
            payment_id: payment.id,
            patient_name: payment.appointments?.patients?.name || "Unknown",
            doctor_name: payment.appointments?.profiles?.name || "Unknown",
            appointment_date: payment.appointments?.appointment_date || "",
            appointment_time: payment.appointments?.appointment_time || "",
            amount: appointmentFee + testPaymentsTotal,
            payment_method: payment.payment_method,
            tests_done: testsDone,
            created_at: payment.created_at,
          };
        }) || [];

      setPaymentData(formattedData);
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = paymentData.filter((item) => {
      const itemDate = new Date(item.created_at);
      const matchesDate = itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      const matchesSearch =
        searchTerm === "" ||
        item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.payment_method.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesSearch;
    });

    setFilteredData(filtered);
  };

  const checkAccessCode = () => {
    if (accessCode === "creative10") {
      setShowAmounts(true);
      setAccessCode("");
    } else {
      alert("Invalid access code");
      setAccessCode("");
    }
  };

  const getTotalRevenue = () => {
    return filteredData.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPaymentMethodBreakdown = () => {
    const breakdown = filteredData.reduce(
      (acc, payment) => {
        acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
        return acc;
      },
      {} as Record<string, number>,
    );
    return breakdown;
  };

  const exportToCSV = () => {
    const headers = [
      "Payment ID",
      "Patient Name",
      "Doctor Name",
      "Appointment Date",
      "Appointment Time",
      ...(showAmounts ? ["Amount", "Payment Method"] : ["Payment Method"]),
      "Tests Done",
      "Payment Date",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        [
          row.payment_id,
          row.patient_name,
          row.doctor_name,
          row.appointment_date,
          row.appointment_time,
          ...(showAmounts ? [row.amount, row.payment_method] : [row.payment_method]),
          `"${row.tests_done}"`,
          format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss"),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-reports-${selectedYear}-${selectedMonth + 1}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => window.close()} className="shrink-0">
              <ArrowLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-medical-dark truncate">Payment Reports</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Financial transactions</p>
            </div>
          </div>
          <Button onClick={exportToCSV} className="bg-primary hover:bg-primary/90 w-full sm:w-auto shrink-0" size="sm">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="sm:inline">Export</span>
          </Button>
        </div>

        {/* Summary Cards */}
        {showAmounts && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-success" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-success">${getTotalRevenue().toFixed(2)}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {months[selectedMonth]} {selectedYear}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Transactions</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-primary">{filteredData.length}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Payments</p>
              </CardContent>
            </Card>

            <Card className="col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Average</CardTitle>
                <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-warning" />
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="text-lg sm:text-2xl font-bold text-warning">
                  ${filteredData.length > 0 ? (getTotalRevenue() / filteredData.length).toFixed(2) : "0.00"}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Per transaction</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Month</label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
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
                <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Year</label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">Search</label>
                <Input
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 block">View Amounts</label>
                {!showAmounts ? (
                  <div className="flex space-x-2">
                    <Input
                      className="h-9 sm:h-10 text-xs sm:text-sm"
                      type="password"
                      placeholder="Code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && checkAccessCode()}
                    />
                    <Button size="sm" onClick={checkAccessCode} className="h-9 sm:h-10 px-2 sm:px-4">
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setShowAmounts(false)} className="h-9 sm:h-10 w-full text-xs sm:text-sm">
                    <EyeOff className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Hide Amounts</span>
                    <span className="sm:hidden">Hide</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Breakdown */}
        {showAmounts && (
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {Object.entries(getPaymentMethodBreakdown()).map(([method, amount]) => (
                  <div key={method} className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="text-base sm:text-lg font-bold">${amount.toFixed(2)}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground capitalize truncate">{method}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between px-1">
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            {filteredData.length} payment{filteredData.length !== 1 ? 's' : ''} • {months[selectedMonth]} {selectedYear}
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                <p className="text-xs sm:text-sm text-muted-foreground">Loading payment reports...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground">
                <IndianRupee className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-xs sm:text-sm">No payments found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap">ID</th>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap">Patient</th>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap hidden md:table-cell">Doctor</th>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap hidden lg:table-cell">Date</th>
                      {showAmounts && <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap">Amount</th>}
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap">Method</th>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap hidden xl:table-cell">Tests</th>
                      <th className="text-left p-2 sm:p-4 font-medium whitespace-nowrap hidden sm:table-cell">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-2 sm:p-4 font-mono text-[10px] sm:text-xs">{row.payment_id.slice(-6)}</td>
                        <td className="p-2 sm:p-4 font-medium max-w-[120px] truncate">{row.patient_name}</td>
                        <td className="p-2 sm:p-4 hidden md:table-cell max-w-[120px] truncate">{row.doctor_name}</td>
                        <td className="p-2 sm:p-4 hidden lg:table-cell whitespace-nowrap">
                          <div className="text-[10px] sm:text-xs">
                            <div>{format(new Date(row.appointment_date), "MMM dd")}</div>
                            <div className="text-muted-foreground">{row.appointment_time}</div>
                          </div>
                        </td>
                        {showAmounts && <td className="p-2 sm:p-4 font-bold text-success whitespace-nowrap">${row.amount.toFixed(2)}</td>}
                        <td className="p-2 sm:p-4">
                          <Badge variant="outline" className="capitalize text-[9px] sm:text-xs px-1.5 sm:px-2">
                            {row.payment_method}
                          </Badge>
                        </td>
                        <td className="p-2 sm:p-4 hidden xl:table-cell max-w-[150px] truncate">{row.tests_done}</td>
                        <td className="p-2 sm:p-4 hidden sm:table-cell whitespace-nowrap text-[10px] sm:text-xs">{format(new Date(row.created_at), "MMM dd, HH:mm")}</td>
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
