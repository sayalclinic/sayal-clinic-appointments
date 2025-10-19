import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Download, Calendar, Search, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppointments } from "@/hooks/useAppointments";
import { supabase } from "@/integrations/supabase/client";

interface PatientHistoryData {
  patient_name: string;
  patient_age: number;
  contact_no: string;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  status: string;
  amount_paid?: number;
  payment_method?: string;
  tests_done?: string;
  reason_for_visit?: string;
  symptoms?: string;
}

export const AppointmentHistory = () => {
  const [historyData, setHistoryData] = useState<PatientHistoryData[]>([]);
  const [filteredData, setFilteredData] = useState<PatientHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [showPayments, setShowPayments] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const { appointments } = useAppointments();

  useEffect(() => {
    fetchAppointmentHistory();
  }, [appointments]);

  useEffect(() => {
    filterData();
  }, [historyData, selectedMonth, selectedYear, searchTerm]);

  const fetchAppointmentHistory = async () => {
    try {
      setLoading(true);

      // Fetch appointments with patient, doctor, and payment data
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          reason_for_visit,
          symptoms,
          patients (
            name,
            age,
            contact_no
          ),
          profiles!appointments_doctor_id_fkey (
            name
          )
        `,
        )
        .eq("status", "completed")
        .order("appointment_date", { ascending: false });

      if (appointmentsError) throw appointmentsError;

      // Fetch payment data separately
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("appointment_id, amount, payment_method, tests_done");

      if (paymentsError) throw paymentsError;

      // Combine the data
      const combinedData =
        appointmentsData?.map((apt) => {
          const payment = paymentsData?.find((p) => p.appointment_id === apt.id);
          return {
            patient_name: apt.patients?.name || "Unknown",
            patient_age: apt.patients?.age || 0,
            contact_no: apt.patients?.contact_no || "",
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            doctor_name: apt.profiles?.name || "Unknown",
            status: apt.status,
            amount_paid: payment?.amount || 0,
            payment_method: payment?.payment_method || "",
            tests_done: payment?.tests_done || "",
            reason_for_visit: apt.reason_for_visit || "",
            symptoms: apt.symptoms || "",
          };
        }) || [];

      setHistoryData(combinedData);
    } catch (error) {
      console.error("Error fetching appointment history:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = historyData.filter((item) => {
      const itemDate = new Date(item.appointment_date);
      const matchesDate = itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      const matchesSearch =
        searchTerm === "" ||
        item.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contact_no.includes(searchTerm);

      return matchesDate && matchesSearch;
    });

    setFilteredData(filtered);
  };

  const checkAccessCode = () => {
    if (accessCode === "creative10") {
      setShowPayments(true);
      setAccessCode("");
    } else {
      alert("Invalid access code");
      setAccessCode("");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Patient Name",
      "Age",
      "Contact",
      "Date",
      "Time",
      "Doctor",
      "Status",
      ...(showPayments ? ["Amount Paid", "Payment Method"] : []),
      "Tests Done",
      "Reason for Visit",
      "Symptoms",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        [
          row.patient_name,
          row.patient_age,
          row.contact_no,
          row.appointment_date,
          row.appointment_time,
          row.doctor_name,
          row.status,
          ...(showPayments ? [row.amount_paid || 0, row.payment_method || ""] : []),
          `"${row.tests_done || ""}"`,
          `"${row.reason_for_visit || ""}"`,
          `"${row.symptoms || ""}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointment-history-${selectedYear}-${selectedMonth + 1}.csv`;
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => window.close()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-medical-dark">Patient History</h1>
              <p className="text-muted-foreground">Complete appointment and patient records</p>
            </div>
          </div>
          <Button onClick={exportToCSV} className="bg-primary hover:bg-primary/90">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                    {years.map((year) => (
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
                  placeholder="Search by name, doctor, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Info</label>
                {!showPayments ? (
                  <div className="flex space-x-2">
                    <Input
                      type="password"
                      placeholder="Enter code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && checkAccessCode()}
                    />
                    <Button size="sm" onClick={checkAccessCode}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowPayments(false)}>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Payments
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredData.length} records for {months[selectedMonth]} {selectedYear}
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading appointment history...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No appointment history found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Patient</th>
                      <th className="text-left p-4 font-medium">Contact</th>
                      <th className="text-left p-4 font-medium">Date & Time</th>
                      <th className="text-left p-4 font-medium">Doctor</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      {showPayments && (
                        <>
                          <th className="text-left p-4 font-medium">Amount</th>
                          <th className="text-left p-4 font-medium">Payment</th>
                        </>
                      )}
                      <th className="text-left p-4 font-medium">Tests Done</th>
                      <th className="text-left p-4 font-medium">Visit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, index) => (
                      <tr key={index} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{row.patient_name}</div>
                            <div className="text-sm text-muted-foreground">Age: {row.patient_age}</div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{row.contact_no}</td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{format(new Date(row.appointment_date), "MMM dd, yyyy")}</div>
                            <div className="text-muted-foreground">{row.appointment_time}</div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{row.doctor_name}</td>
                        <td className="p-4">
                          <Badge variant={row.status === "completed" ? "default" : "secondary"}>{row.status}</Badge>
                        </td>
                        {showPayments && (
                          <>
                            <td className="p-4 text-sm font-medium">${row.amount_paid?.toFixed(2) || "0.00"}</td>
                            <td className="p-4 text-sm">{row.payment_method || "N/A"}</td>
                          </>
                        )}
                        <td className="p-4 text-sm">{row.tests_done || "None"}</td>
                        <td className="p-4 text-sm max-w-xs">
                          <div className="space-y-1">
                            {row.reason_for_visit && (
                              <div>
                                <strong>Reason:</strong> {row.reason_for_visit}
                              </div>
                            )}
                            {row.symptoms && (
                              <div>
                                <strong>Symptoms:</strong> {row.symptoms}
                              </div>
                            )}
                          </div>
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
