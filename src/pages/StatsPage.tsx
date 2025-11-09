import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/Auth/PinDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
interface AppointmentHistoryRow {
  patient_name: string;
  patient_age: number;
  patient_contact: string;
  appointment_date: string;
  doctor_name: string;
}
interface PatientHistoryRow {
  name: string;
  age: number;
  contact_no: string;
}
interface PaymentHistoryRow {
  patient_name: string;
  date: string;
  tests_done: string;
  amount: number;
  payment_method: string;
}
export const StatsPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistoryRow[]>([]);
  const [patientHistory, setPatientHistory] = useState<PatientHistoryRow[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRow[]>([]);
  const [openModal, setOpenModal] = useState<"appointments" | "patients" | "payments" | null>(null);
  const [ageFilter, setAgeFilter] = useState<"all" | "monthly">("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [patientTypeFilter, setPatientTypeFilter] = useState<"all" | "monthly">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "monthly">("all");
  const [incomeDistributionFilter, setIncomeDistributionFilter] = useState<"all" | "monthly">("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const fetchData = async () => {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Fetch monthly earnings for current month
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount, created_at")
        .gte("created_at", firstDayOfMonth.toISOString())
        .lte("created_at", lastDayOfMonth.toISOString());
      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }
      const monthlyTotal =
        payments?.reduce(
          (sum, payment) =>
            sum +
            parseFloat(
              String(payment.amount ?? 0)
                .toString()
                .replace(/,/g, ""),
            ),
          0,
        ) || 0;
      console.log("Monthly earnings calculated:", monthlyTotal, "from", payments?.length, "payments");
      setMonthlyEarnings(monthlyTotal);

      // Fetch appointment history
      const { data: appointments } = await supabase
        .from("appointments")
        .select(
          `
          patient_name,
          appointment_date,
          patients (name, age, contact_no),
          doctor_profile:profiles!appointments_doctor_id_fkey (name)
        `,
        )
        .order("appointment_date", {
          ascending: false,
        });
      const appointmentData: AppointmentHistoryRow[] =
        appointments?.map((apt) => ({
          patient_name: apt.patients?.name || apt.patient_name || "Unknown",
          patient_age: apt.patients?.age || 0,
          patient_contact: apt.patients?.contact_no || "N/A",
          appointment_date: apt.appointment_date,
          doctor_name: apt.doctor_profile?.name || "Unknown",
        })) || [];
      setAppointmentHistory(appointmentData);

      // Fetch patient history
      const { data: patients } = await supabase.from("patients").select("name, age, contact_no").order("name", {
        ascending: true,
      });
      if (patients) {
        setPatientHistory(patients);
      }

      // Fetch payment history
      const { data: paymentData } = await supabase
        .from("payments")
        .select(
          `
          amount,
          payment_method,
          tests_done,
          created_at,
          appointments (
            patient_name,
            patients (name)
          )
        `,
        )
        .order("created_at", {
          ascending: false,
        });
      const paymentHistoryData: PaymentHistoryRow[] =
        paymentData?.map((p) => ({
          patient_name: p.appointments?.patients?.name || p.appointments?.patient_name || "Unknown",
          date: new Date(p.created_at).toLocaleDateString(),
          tests_done: p.tests_done || "N/A",
          amount: Number(p.amount),
          payment_method: p.payment_method,
        })) || [];
      setPaymentHistory(paymentHistoryData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, toast]);

  // Calculate age distribution from appointments
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  useEffect(() => {
    const fetchPatientVisits = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            appointment_date,
            patients!inner (age)
          `,
          )
          .not("patients.age", "is", null);
        if (error) {
          console.error("Error fetching appointment data:", error);
        }
        if (data) {
          const formattedData = data.map((apt) => ({
            visit_date: apt.appointment_date,
            patients: {
              age: apt.patients.age,
            },
          }));
          setPatientVisits(formattedData);
        }
      }
    };
    fetchPatientVisits();
  }, [isAuthenticated]);
  const filteredVisits = patientVisits.filter((visit) => {
    if (ageFilter === "all") return true;
    const visitDate = new Date(visit.visit_date);
    return visitDate.getMonth() === selectedMonth && visitDate.getFullYear() === selectedYear;
  });
  const ageData = filteredVisits.reduce(
    (acc, visit) => {
      const age = visit.patients?.age;
      if (!age) return acc;
      let ageGroup = "";
      if (age < 18) ageGroup = "0-17";
      else if (age < 30) ageGroup = "18-29";
      else if (age < 45) ageGroup = "30-44";
      else if (age < 60) ageGroup = "45-59";
      else ageGroup = "60+";
      const existing = acc.find((item) => item.name === ageGroup);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({
          name: ageGroup,
          value: 1,
        });
      }
      return acc;
    },
    [] as {
      name: string;
      value: number;
    }[],
  );

  // Sort age data by age group
  const ageGroupOrder = ["0-17", "18-29", "30-44", "45-59", "60+"];
  ageData.sort((a, b) => ageGroupOrder.indexOf(a.name) - ageGroupOrder.indexOf(b.name));
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
  const years = Array.from(
    {
      length: 10,
    },
    (_, i) => new Date().getFullYear() - i,
  );

  // Patient type data (new vs repeat, paying vs non-paying)
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);
  useEffect(() => {
    const fetchAppointmentsData = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase
          .from("appointments")
          .select("appointment_date, is_repeat, requires_payment");
        if (error) {
          console.error("Error fetching appointments data:", error);
        }
        if (data) {
          setAppointmentsData(data);
        }
      }
    };
    fetchAppointmentsData();
  }, [isAuthenticated]);
  const filteredAppointments = appointmentsData.filter((apt) => {
    if (patientTypeFilter === "all") return true;
    const aptDate = new Date(apt.appointment_date);
    return aptDate.getMonth() === selectedMonth && aptDate.getFullYear() === selectedYear;
  });
  const patientTypeData = [
    {
      name: "New Patient",
      value: filteredAppointments.filter((a) => !a.is_repeat && a.requires_payment).length,
      color: "hsl(200, 70%, 75%)",
    },
    {
      name: "Repeat Paying",
      value: filteredAppointments.filter((a) => a.is_repeat && a.requires_payment).length,
      color: "hsl(200, 70%, 60%)",
    },
    {
      name: "Repeat Non Paying",
      value: filteredAppointments.filter((a) => a.is_repeat && !a.requires_payment).length,
      color: "hsl(0, 70%, 75%)",
    },
  ].filter((item) => item.value > 0);

  // Payment method data
  const [allPayments, setAllPayments] = useState<any[]>([]);
  useEffect(() => {
    const fetchAllPayments = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase.from("payments").select("payment_method, amount, created_at, appointment_fee, test_payments");
        if (error) {
          console.error("Error fetching all payments:", error);
        }
        if (data) {
          setAllPayments(data);
        }
      }
    };
    fetchAllPayments();
  }, [isAuthenticated]);
  const filteredPayments = allPayments.filter((payment) => {
    if (paymentMethodFilter === "all") return true;
    const paymentDate = new Date(payment.created_at);
    return paymentDate.getMonth() === selectedMonth && paymentDate.getFullYear() === selectedYear;
  });
  const paymentMethodData = filteredPayments.reduce(
    (acc, payment) => {
      const method = payment.payment_method;
      const existing = acc.find((item) => item.name === method);
      const amt = parseFloat(
        String(payment.amount ?? 0)
          .toString()
          .replace(/,/g, ""),
      );
      if (existing) {
        existing.value += amt;
      } else {
        acc.push({
          name: method,
          value: amt,
          color: method === "cash" ? "hsl(200, 70%, 70%)" : "hsl(200, 70%, 55%)",
        });
      }
      return acc;
    },
    [] as {
      name: string;
      value: number;
      color: string;
    }[],
  );

  const totalPayments = paymentMethodData.reduce((sum, item) => sum + item.value, 0);

  // Income distribution data (appointments vs tests)
  const filteredIncomePayments = allPayments.filter((payment) => {
    if (incomeDistributionFilter === "all") return true;
    const paymentDate = new Date(payment.created_at);
    return paymentDate.getMonth() === selectedMonth && paymentDate.getFullYear() === selectedYear;
  });

  const incomeDistributionData = (() => {
    const distribution: { name: string; value: number; color: string }[] = [];
    
    filteredIncomePayments.forEach((payment) => {
      // Add appointment fee
      const appointmentFee = payment.appointment_fee ? parseFloat(String(payment.appointment_fee).replace(/,/g, "")) : 0;
      if (appointmentFee > 0) {
        const existing = distribution.find(item => item.name === "Appointment Fee");
        if (existing) {
          existing.value += appointmentFee;
        } else {
          distribution.push({
            name: "Appointment Fee",
            value: appointmentFee,
            color: "hsl(200, 70%, 75%)"
          });
        }
      }
      
      // Add individual test payments
      if (payment.test_payments && Array.isArray(payment.test_payments)) {
        payment.test_payments.forEach((test: any) => {
          const testAmount = parseFloat(String(test.amount ?? 0).replace(/,/g, ""));
          if (testAmount > 0) {
            const existing = distribution.find(item => item.name === test.test_name);
            if (existing) {
              existing.value += testAmount;
            } else {
              distribution.push({
                name: test.test_name,
                value: testAmount,
                color: PASTEL_BLUE_SHADES[distribution.length % PASTEL_BLUE_SHADES.length]
              });
            }
          }
        });
      }
    });
    
    return distribution;
  })();

  const totalIncomeDistribution = incomeDistributionData.reduce((sum, item) => sum + item.value, 0);

  // Monthly earnings bar chart data
  const [monthlyEarningsData, setMonthlyEarningsData] = useState<any[]>([]);
  const [earningsView, setEarningsView] = useState<"monthly" | "weekly">("monthly");
  const [selectedEarningsMonth, setSelectedEarningsMonth] = useState<number | null>(null);
  const [selectedEarningsYear, setSelectedEarningsYear] = useState<number | null>(null);

  useEffect(() => {
    const fetchMonthlyEarnings = async () => {
      if (isAuthenticated) {
        const now = new Date();
        const startOfWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0).toISOString();
        const endOfWindow = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).toISOString();
        const { data, error } = await supabase
          .from("payments")
          .select("amount, created_at")
          .gte("created_at", startOfWindow)
          .lt("created_at", endOfWindow);

        if (error) {
          console.error("Error fetching monthly earnings:", error);
          return;
        }

        if (data) {
          console.log(
            "Payments fetched for earnings:",
            data.length,
            data.slice(0, 3).map((p: any) => p.created_at),
          );
          const now = new Date();
          const monthsWindow = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            return {
              label: `${months[d.getMonth()]} ${d.getFullYear()}`,
              earnings: 0,
              monthIndex: d.getMonth(),
              year: d.getFullYear(),
            };
          });

          if (earningsView === "monthly") {
            data.forEach((payment: any) => {
              const date = new Date(payment.created_at);
              const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
              const amt = parseFloat(
                String(payment.amount ?? 0)
                  .toString()
                  .replace(/,/g, ""),
              );
              const bucket = monthsWindow.find((m) => m.label === key);
              if (bucket) bucket.earnings += amt;
            });
            setMonthlyEarningsData(monthsWindow);
          } else if (earningsView === "weekly" && selectedEarningsMonth !== null && selectedEarningsYear !== null) {
            const start = new Date(selectedEarningsYear, selectedEarningsMonth, 1, 0, 0, 0, 0);
            const end = new Date(selectedEarningsYear, selectedEarningsMonth + 1, 0, 23, 59, 59, 999);
            const weeklyData = [
              { week: "Week 1", earnings: 0 },
              { week: "Week 2", earnings: 0 },
              { week: "Week 3", earnings: 0 },
              { week: "Week 4", earnings: 0 },
            ];
            data.forEach((payment: any) => {
              const date = new Date(payment.created_at);
              if (date >= start && date <= end) {
                const day = date.getDate();
                const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
                const amt = parseFloat(
                  String(payment.amount ?? 0)
                    .toString()
                    .replace(/,/g, ""),
                );
                weeklyData[weekIndex].earnings += amt;
              }
            });
            setMonthlyEarningsData(weeklyData);
          }
        }
      }
    };
    fetchMonthlyEarnings();
  }, [isAuthenticated, earningsView, selectedEarningsMonth]);
  // Pastel blue shades for charts
  const PASTEL_BLUE_SHADES = [
    "hsl(200, 70%, 75%)",
    "hsl(200, 70%, 65%)",
    "hsl(200, 70%, 55%)",
    "hsl(210, 75%, 70%)",
    "hsl(210, 75%, 60%)",
    "hsl(220, 80%, 70%)",
  ];

  const PASTEL_RED = "hsl(0, 70%, 75%)";
  const COLORS = PASTEL_BLUE_SHADES;
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header] || "";
            return `"${value}"`;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center">
        <PinDialog
          open={true}
          onOpenChange={() => navigate("/dashboard")}
          onSuccess={() => setIsAuthenticated(true)}
          title="Receptionist Authentication"
          description="Enter PIN to access statistics (PIN: 1978)"
        />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-3xl font-bold text-primary">Statistics & Reports</h1>
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="sm">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        {/* Analytics Section */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Analytics & Insights</h2>

          {/* Monthly Earnings Bar Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">
                  {earningsView === "monthly"
                    ? `Monthly Earnings - Last 12 Months`
                    : `Weekly Earnings - ${selectedEarningsMonth !== null && selectedEarningsYear !== null ? months[selectedEarningsMonth] + " " + selectedEarningsYear : ""}`}
                </CardTitle>
                {earningsView === "weekly" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEarningsView("monthly");
                      setSelectedEarningsMonth(null);
                      setSelectedEarningsYear(null);
                    }}
                    className="text-xs"
                  >
                    ← Back to Monthly
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {monthlyEarningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={monthlyEarningsData}
                    onClick={(data) => {
                      if (earningsView === "monthly" && data && data.activePayload) {
                        const payload = data.activePayload[0].payload as any;
                        const monthIndex = payload.monthIndex;
                        const year = payload.year;
                        setSelectedEarningsMonth(monthIndex);
                        setSelectedEarningsYear(year);
                        setEarningsView("weekly");
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey={earningsView === "monthly" ? "label" : "week"}
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => `₹${value.toFixed(2)}`}
                      cursor={{ fill: "hsl(200, 70%, 90%)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="earnings" fill="hsl(200, 70%, 65%)" name="Earnings (₹)" cursor="pointer" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
              {earningsView === "monthly" && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Click on a month to view weekly earnings
                </p>
              )}
            </CardContent>
          </Card>

          {/* Age Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Age Distribution</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={ageFilter} onValueChange={(v: "all" | "monthly") => setAgeFilter(v)}>
                    <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {ageFilter === "monthly" && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="value" fill="hsl(200, 70%, 65%)" name="Visits" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Patient Type Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Patient Type Distribution</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={patientTypeFilter} onValueChange={(v: "all" | "monthly") => setPatientTypeFilter(v)}>
                    <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {patientTypeFilter === "monthly" && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {patientTypeData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={patientTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {patientTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    {(() => {
                      const total = patientTypeData.reduce((s, i) => s + i.value, 0);
                      return patientTypeData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                          <span className="ml-auto font-medium">{((item.value / total) * 100).toFixed(1)}%</span>
                        </div>
                      ));
                    })()}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Payment Method Distribution</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={paymentMethodFilter}
                    onValueChange={(v: "all" | "monthly") => setPaymentMethodFilter(v)}
                  >
                    <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentMethodFilter === "monthly" && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {paymentMethodData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${((value / totalPayments) * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    {paymentMethodData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto font-medium">{((item.value / totalPayments) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Income Distribution Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base sm:text-lg">Income Distribution (Appointments vs Tests)</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={incomeDistributionFilter}
                    onValueChange={(v: "all" | "monthly") => setIncomeDistributionFilter(v)}
                  >
                    <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  {incomeDistributionFilter === "monthly" && (
                    <>
                      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
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
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {incomeDistributionData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomeDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {incomeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toFixed(2)} (${((value / totalIncomeDistribution) * 100).toFixed(1)}%)`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    {incomeDistributionData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto font-medium whitespace-nowrap">{((item.value / totalIncomeDistribution) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CSV Downloads Section */}
        <div className="space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold text-primary">Download Reports</h2>

          {/* Appointment History */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setOpenModal("appointments")}
          >
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Appointment History</span>
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Patient History */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenModal("patients")}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Patient History</span>
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Payment History */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setOpenModal("payments")}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Payment History</span>
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Appointment History Modal */}
        <Dialog open={openModal === "appointments"} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-3 sm:p-6 pb-3">
              <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-base sm:text-lg">Appointment History</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(appointmentHistory, "appointment-history")}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto px-3 sm:px-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Patient</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Age</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap hidden sm:table-cell">Phone</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap">Date</th>
                    <th className="text-left p-1 sm:p-2 whitespace-nowrap hidden md:table-cell">Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {appointmentHistory.map((apt, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-1 sm:p-2 max-w-[100px] truncate">{apt.patient_name}</td>
                      <td className="p-1 sm:p-2">{apt.patient_age}</td>
                      <td className="p-1 sm:p-2 hidden sm:table-cell">{apt.patient_contact}</td>
                      <td className="p-1 sm:p-2 whitespace-nowrap">{apt.appointment_date}</td>
                      <td className="p-1 sm:p-2 hidden md:table-cell max-w-[120px] truncate">{apt.doctor_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Patient History Modal */}
        <Dialog open={openModal === "patients"} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-3 sm:p-6 pb-3">
              <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-base sm:text-lg">Patient History</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCSV(patientHistory, "patient-history")}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto px-3 sm:px-6">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-1 sm:p-2">Name</th>
                    <th className="text-left p-1 sm:p-2">Age</th>
                    <th className="text-left p-1 sm:p-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {patientHistory.map((patient, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-1 sm:p-2 max-w-[150px] truncate">{patient.name}</td>
                      <td className="p-1 sm:p-2">{patient.age}</td>
                      <td className="p-1 sm:p-2">{patient.contact_no}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment History Modal */}
        <Dialog open={openModal === "payments"} onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Payment History</span>
                <Button variant="outline" size="sm" onClick={() => downloadCSV(paymentHistory, "payment-history")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Patient</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Tests</th>
                    <th className="text-left p-2">Amount</th>
                    <th className="text-left p-2">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, idx) => (
                    <tr key={idx} className="border-b hover:bg-accent/5">
                      <td className="p-2">{payment.patient_name}</td>
                      <td className="p-2">{payment.date}</td>
                      <td className="p-2">{payment.tests_done || "N/A"}</td>
                      <td className="p-2">₹{payment.amount.toFixed(2)}</td>
                      <td className="p-2">{payment.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
