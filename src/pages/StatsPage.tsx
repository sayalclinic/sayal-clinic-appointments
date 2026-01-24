import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PinDialog } from "@/components/Auth/PinDialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Maximize2, CalendarIcon } from "lucide-react";
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
  LineChart,
  Line,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportClearUtility } from "@/components/DataExport/ExportClearUtility";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [ageFilter, setAgeFilter] = useState<"all" | "monthly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateFilterMode, setDateFilterMode] = useState<"all" | "specific">("all");
  const [patientTypeFilter, setPatientTypeFilter] = useState<"all" | "monthly">("monthly");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<"all" | "monthly">("monthly");
  const [incomeDistributionFilter, setIncomeDistributionFilter] = useState<"all" | "monthly">("monthly");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  // Track which panel is currently open (only one at a time)
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  
  const togglePanel = (panel: string) => {
    setOpenPanel(prev => prev === panel ? null : panel);
  };
  const [counterFilter, setCounterFilter] = useState<"all" | "monthly">("monthly");
  const [labVsNormalFilter, setLabVsNormalFilter] = useState<"all" | "monthly">("monthly");
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
        .select("appointment_fee, test_payments, created_at")
        .gte("created_at", firstDayOfMonth.toISOString())
        .lte("created_at", lastDayOfMonth.toISOString());
      if (paymentsError) {
        console.error("Error fetching payments:", paymentsError);
      }
      const monthlyTotal =
        payments?.reduce((sum, payment) => {
          const appointmentFee = parseFloat(String(payment.appointment_fee ?? 0).replace(/,/g, ""));
          const testPaymentsArray = payment.test_payments as any;
          const testPayments = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((testSum: number, test: any) => 
                testSum + parseFloat(String(test.amount ?? 0).replace(/,/g, "")), 0)
            : 0;
          return sum + appointmentFee + testPayments;
        }, 0) || 0;
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
          appointment_fee,
          test_payments,
          payment_method,
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
        paymentData?.map((p) => {
          const appointmentFee = Number(p.appointment_fee ?? 0);
          const testPaymentsArray = p.test_payments as any;
          const testPaymentsTotal = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((sum: number, test: any) => sum + Number(test.amount ?? 0), 0)
            : 0;
          const testsDone = Array.isArray(testPaymentsArray) && testPaymentsArray.length > 0
            ? testPaymentsArray.map((t: any) => t.test_name).join(', ')
            : 'N/A';
          return {
            patient_name: p.appointments?.patients?.name || p.appointments?.patient_name || "Unknown",
            date: new Date(p.created_at).toLocaleDateString(),
            tests_done: testsDone,
            amount: appointmentFee + testPaymentsTotal,
            payment_method: p.payment_method,
          };
        }) || [];
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
    return matchesDateFilter(visitDate);
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

  // Pastel blue shades for charts (defined early to avoid hoisting issues)
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

  // Helper function to capitalize labels
  const capitalizeLabel = (label: string): string => {
    if (!label) return label;
    return label
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Rename test names for display
  const renameTestName = (testName: string): string => {
    const nameMap: Record<string, string> = {
      'Blood Test': 'Labs',
      'blood test': 'Labs',
      'Sputum Test': 'Dressings',
      'sputum test': 'Dressings',
      'Urine Test': 'Injections',
      'urine test': 'Injections',
      'Body Fluids': 'Nebulization',
      'body fluids': 'Nebulization',
      'Body Fluid': 'Nebulization',
      'body fluid': 'Nebulization',
    };
    return nameMap[testName] || testName;
  };

  // Patient type data (new vs repeat, paying vs non-paying)
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);
  useEffect(() => {
    const fetchAppointmentsData = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase
          .from("appointments")
          .select("id, patient_id, patient_name, appointment_date, appointment_time, is_repeat, requires_payment, is_lab_only");
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

  // Calculate available months/years from appointment data
  const availableMonthsYears = useMemo(() => {
    const monthYearSet = new Set<string>();
    const availableDates = new Set<string>();
    
    appointmentsData.forEach((apt: any) => {
      const d = new Date(apt.appointment_date);
      monthYearSet.add(`${d.getMonth()}-${d.getFullYear()}`);
      availableDates.add(apt.appointment_date);
    });
    
    const result: { month: number; year: number }[] = [];
    monthYearSet.forEach((key) => {
      const [month, year] = key.split("-").map(Number);
      result.push({ month, year });
    });
    
    // Sort by year descending, then month descending
    result.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    return { monthYears: result, dates: availableDates };
  }, [appointmentsData]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    availableMonthsYears.monthYears.forEach((my) => yearSet.add(my.year));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [availableMonthsYears]);

  const availableMonthsForYear = useMemo(() => {
    return availableMonthsYears.monthYears
      .filter((my) => my.year === selectedYear)
      .map((my) => my.month)
      .sort((a, b) => b - a);
  }, [availableMonthsYears, selectedYear]);

  // Check if a date has data for the calendar
  const hasDataForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableMonthsYears.dates.has(dateStr);
  };

  // Filter helper that applies date filter
  const matchesDateFilter = (aptDate: Date) => {
    if (dateFilterMode === "specific" && selectedDate) {
      return format(aptDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
    }
    return aptDate.getMonth() === selectedMonth && aptDate.getFullYear() === selectedYear;
  };
  
  // Get available days for selected month/year
  const availableDaysForMonth = useMemo(() => {
    const days: number[] = [];
    availableMonthsYears.dates.forEach((dateStr) => {
      const d = new Date(dateStr);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
        days.push(d.getDate());
      }
    });
    return days.sort((a, b) => a - b);
  }, [availableMonthsYears, selectedMonth, selectedYear]);

  // DateFilterControls component for reuse
  const DateFilterControls = ({ filter, setFilter }: { filter: "all" | "monthly"; setFilter: (v: "all" | "monthly") => void }) => (
    <div className="flex flex-wrap gap-2">
      <Select value={filter} onValueChange={(v: "all" | "monthly") => setFilter(v)}>
        <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
      {filter === "monthly" && (
        <>
          <Select 
            value={selectedMonth.toString()} 
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonthsForYear.length > 0 ? (
                availableMonthsForYear.map((monthIdx) => (
                  <SelectItem key={monthIdx} value={monthIdx.toString()}>
                    {months[monthIdx]}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={selectedMonth.toString()}>
                  {months[selectedMonth]}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(v) => {
              const newYear = parseInt(v);
              setSelectedYear(newYear);
              const monthsForNewYear = availableMonthsYears.monthYears
                .filter((my) => my.year === newYear)
                .map((my) => my.month);
              if (monthsForNewYear.length > 0 && !monthsForNewYear.includes(selectedMonth)) {
                setSelectedMonth(monthsForNewYear[0]);
              }
            }}
          >
            <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.length > 0 ? (
                availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={selectedYear.toString()}>
                  {selectedYear}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-24 sm:w-28 h-8 sm:h-10 text-xs sm:text-sm justify-start text-left font-normal",
                  dateFilterMode === "specific" && selectedDate ? "" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                {dateFilterMode === "specific" && selectedDate ? format(selectedDate, "dd") : "All Days"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <Checkbox
                  id="all-days-checkbox"
                  checked={dateFilterMode === "all"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDateFilterMode("all");
                      setSelectedDate(undefined);
                    } else {
                      setDateFilterMode("specific");
                    }
                  }}
                />
                <label 
                  htmlFor="all-days-checkbox" 
                  className="text-sm font-medium cursor-pointer"
                >
                  All Days
                </label>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    setDateFilterMode("specific");
                  }
                }}
                month={new Date(selectedYear, selectedMonth)}
                onMonthChange={() => {}}
                modifiers={{
                  hasData: (date) => hasDataForDate(date),
                }}
                modifiersStyles={{
                  hasData: { fontWeight: "bold", backgroundColor: "hsl(var(--primary) / 0.1)" },
                }}
                disabled={(date) => {
                  const d = new Date(date);
                  return d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear || !hasDataForDate(date);
                }}
                initialFocus
                className="pointer-events-auto"
                classNames={{
                  nav: "hidden",
                  caption: "hidden",
                }}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
  
  // Filter out lab-only appointments for patient counting
  const normalAppointmentsData = appointmentsData.filter((a) => !a.is_lab_only);
  const labOnlyAppointmentsData = appointmentsData.filter((a) => a.is_lab_only);
  const filteredAppointments = normalAppointmentsData.filter((apt) => {
    if (patientTypeFilter === "all") return true;
    const aptDate = new Date(apt.appointment_date);
    return matchesDateFilter(aptDate);
  });
  
  // Lab vs Normal patient data for pie chart
  const filteredLabVsNormalAppointments = (() => {
    if (labVsNormalFilter === "all") return appointmentsData;
    return appointmentsData.filter((apt) => {
      const aptDate = new Date(apt.appointment_date);
      return matchesDateFilter(aptDate);
    });
  })();
  
  const labVsNormalData = [
    {
      name: "Normal Patients",
      value: filteredLabVsNormalAppointments.filter((a) => !a.is_lab_only).length,
      color: "hsl(200, 70%, 65%)",
    },
    {
      name: "Lab Only Visits",
      value: filteredLabVsNormalAppointments.filter((a) => a.is_lab_only).length,
      color: "hsl(45, 70%, 65%)",
    },
  ].filter((item) => item.value > 0);
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

  // Build appointment maps for month grouping
  const appointmentMonthMap = new Map<string, { month: number; year: number; date: Date }>();
  appointmentsData.forEach((a: any) => {
    const d = new Date(a.appointment_date);
    appointmentMonthMap.set(a.id, { month: d.getMonth(), year: d.getFullYear(), date: d });
  });
  const monthlyAppointmentIdSet = new Set<string>(
    appointmentsData
      .filter((a: any) => {
        const d = new Date(a.appointment_date);
        return matchesDateFilter(d);
      })
      .map((a: any) => a.id)
  );

  // Payment method data
  const [allPayments, setAllPayments] = useState<any[]>([]);
  useEffect(() => {
    const fetchAllPayments = async () => {
      if (isAuthenticated) {
        const { data, error } = await supabase.from("payments").select("appointment_id, payment_method, labs_payment_method, created_at, appointment_fee, test_payments");
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
    return monthlyAppointmentIdSet.has(payment.appointment_id);
  });

  // Consultation payment method data (appointment_fee only) - uses payment_method field
  const consultationPaymentMethodData = filteredPayments.reduce(
    (acc, payment) => {
      const method = capitalizeLabel(payment.payment_method || 'Unknown');
      const appointmentFee = parseFloat(String(payment.appointment_fee ?? 0).replace(/,/g, ""));
      
      if (appointmentFee > 0 && method && method !== 'None' && method !== 'Unknown') {
        const existing = acc.find((item) => item.name === method);
        if (existing) {
          existing.value += appointmentFee;
        } else {
          acc.push({
            name: method,
            value: appointmentFee,
            color: method === "Cash" ? "hsl(200, 70%, 70%)" : method === "Upi" ? "hsl(200, 70%, 55%)" : "hsl(200, 70%, 60%)",
          });
        }
      }
      return acc;
    },
    [] as {
      name: string;
      value: number;
      color: string;
    }[],
  );

  // Labs/Tests payment method data (test_payments only) - uses labs_payment_method field
  const labsPaymentMethodData = filteredPayments.reduce(
    (acc, payment) => {
      // Use labs_payment_method if available, otherwise fall back to payment_method for legacy data
      const method = capitalizeLabel(payment.labs_payment_method || payment.payment_method || 'Unknown');
      const testPaymentsArray = payment.test_payments as any;
      const testPaymentsTotal = Array.isArray(testPaymentsArray)
        ? testPaymentsArray.reduce((sum: number, test: any) => 
            sum + parseFloat(String(test.amount ?? 0).replace(/,/g, "")), 0)
        : 0;
      
      if (testPaymentsTotal > 0 && method && method !== 'None' && method !== 'Unknown') {
        const existing = acc.find((item) => item.name === method);
        if (existing) {
          existing.value += testPaymentsTotal;
        } else {
          acc.push({
            name: method,
            value: testPaymentsTotal,
            color: method === "Cash" ? "hsl(200, 70%, 70%)" : method === "Upi" ? "hsl(200, 70%, 55%)" : "hsl(200, 70%, 60%)",
          });
        }
      }
      return acc;
    },
    [] as {
      name: string;
      value: number;
      color: string;
    }[],
  );

  const totalConsultationPayments = consultationPaymentMethodData.reduce((sum, item) => sum + item.value, 0);
  const totalLabsPayments = labsPaymentMethodData.reduce((sum, item) => sum + item.value, 0);

  // Income distribution data (appointments vs tests)
  const filteredIncomePayments = allPayments.filter((payment) => {
    if (incomeDistributionFilter === "all") return true;
    return monthlyAppointmentIdSet.has(payment.appointment_id);
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
      
      // Add individual test payments with renamed test names
      const testPaymentsArray = payment.test_payments as any;
      if (testPaymentsArray && Array.isArray(testPaymentsArray)) {
        testPaymentsArray.forEach((test: any) => {
          const testAmount = parseFloat(String(test.amount ?? 0).replace(/,/g, ""));
          if (testAmount > 0) {
            const renamedTestName = renameTestName(test.test_name);
            const existing = distribution.find(item => item.name === renamedTestName);
            if (existing) {
              existing.value += testAmount;
            } else {
              distribution.push({
                name: renamedTestName,
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
    if (!isAuthenticated) return;

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
      allPayments.forEach((payment: any) => {
        const m = appointmentMonthMap.get(payment.appointment_id);
        if (!m) return;
        const idx = monthsWindow.findIndex((x) => x.monthIndex === m.month && x.year === m.year);
        if (idx !== -1) {
          const appointmentFee = parseFloat(String(payment.appointment_fee ?? 0).replace(/,/g, ""));
          const testPaymentsArray = payment.test_payments as any;
          const testPaymentsTotal = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((sum: number, test: any) => 
                sum + parseFloat(String(test.amount ?? 0).replace(/,/g, "")), 0)
            : 0;
          const amt = appointmentFee + testPaymentsTotal;
          monthsWindow[idx].earnings += amt;
        }
      });
      setMonthlyEarningsData(monthsWindow);
    } else if (earningsView === "weekly" && selectedEarningsMonth !== null && selectedEarningsYear !== null) {
      const weeklyData = [
        { week: "Week 1", earnings: 0 },
        { week: "Week 2", earnings: 0 },
        { week: "Week 3", earnings: 0 },
        { week: "Week 4", earnings: 0 },
      ];

      allPayments.forEach((payment: any) => {
        const m = appointmentMonthMap.get(payment.appointment_id);
        if (!m) return;
        if (m.month === selectedEarningsMonth && m.year === selectedEarningsYear) {
          const day = m.date.getDate();
          const weekIndex = Math.min(Math.floor((day - 1) / 7), 3);
          const appointmentFee = parseFloat(String(payment.appointment_fee ?? 0).replace(/,/g, ""));
          const testPaymentsArray = payment.test_payments as any;
          const testPaymentsTotal = Array.isArray(testPaymentsArray)
            ? testPaymentsArray.reduce((sum: number, test: any) => 
                sum + parseFloat(String(test.amount ?? 0).replace(/,/g, "")), 0)
            : 0;
          const amt = appointmentFee + testPaymentsTotal;
          weeklyData[weekIndex].earnings += amt;
        }
      });
      setMonthlyEarningsData(weeklyData);
    }
  }, [isAuthenticated, earningsView, selectedEarningsMonth, selectedEarningsYear, allPayments, appointmentsData]);
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

          {/* Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* EARNINGS CARD - Most Prominent */}
            <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-card border-primary/30 shadow-lg ring-2 ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-primary">Total Earnings</CardTitle>
                <Select
                  value={counterFilter}
                  onValueChange={(v: "all" | "monthly") => setCounterFilter(v)}
                >
                  <SelectTrigger className="w-24 h-8 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-primary">
                  ₹{(() => {
                    if (counterFilter === "all") {
                      return allPayments.reduce((sum, payment) => {
                        const appointmentFee = Number(payment.appointment_fee || 0);
                        const testPaymentsArray = payment.test_payments as any;
                        const testTotal = Array.isArray(testPaymentsArray)
                          ? testPaymentsArray.reduce((testSum: number, test: any) => testSum + Number(test.amount || 0), 0)
                          : 0;
                        return sum + appointmentFee + testTotal;
                      }, 0).toLocaleString();
                    }
                    const monthlyPayments = allPayments.filter((payment: any) => {
                      const m = appointmentMonthMap.get(payment.appointment_id);
                      if (!m) return false;
                      return matchesDateFilter(m.date);
                    });
                    return monthlyPayments.reduce((sum, payment) => {
                      const appointmentFee = Number(payment.appointment_fee || 0);
                      const testPaymentsArray = payment.test_payments as any;
                      const testTotal = Array.isArray(testPaymentsArray)
                        ? testPaymentsArray.reduce((testSum: number, test: any) => testSum + Number(test.amount || 0), 0)
                        : 0;
                      return sum + appointmentFee + testTotal;
                    }, 0).toLocaleString();
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Revenue generated</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <Select
                  value={counterFilter}
                  onValueChange={(v: "all" | "monthly") => setCounterFilter(v)}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(() => {
                    // Exclude lab-only patients from counting
                    if (counterFilter === "all") {
                      return new Set(normalAppointmentsData.map((a: any) => a.patient_id || a.patient_name)).size;
                    }
                    const monthlyAppointments = normalAppointmentsData.filter((a: any) => {
                      const d = new Date(a.appointment_date);
                      return matchesDateFilter(d);
                    });
                    return new Set(monthlyAppointments.map((a: any) => a.patient_id || a.patient_name)).size;
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">Unique patients (excludes lab-only)</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-card to-medical-light/50 border-medical-accent/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Select
                  value={counterFilter}
                  onValueChange={(v: "all" | "monthly") => setCounterFilter(v)}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {counterFilter === "all"
                    ? appointmentsData.length
                    : appointmentsData.filter((a: any) => {
                        const d = new Date(a.appointment_date);
                        return matchesDateFilter(d);
                      }).length}
                </div>
                <p className="text-xs text-muted-foreground">Total appointments</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Earnings Bar Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Monthly Earnings</CardTitle>
              {openPanel !== 'earnings' ? (
                <Button 
                  variant="outline" 
                  onClick={() => togglePanel('earnings')} 
                  className="w-full"
                >
                  Expand
                </Button>
              ) : (
                <div className="flex items-center gap-2">
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
                  <Button variant="outline" onClick={() => togglePanel('earnings')} className="w-full">
                    Collapse
                  </Button>
                </div>
              )}
            </CardHeader>
            {openPanel === 'earnings' && (
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
             </CardContent>
            )}
           </Card>

          {/* Busiest Hours Line Graph */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Busiest Hours</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => togglePanel('busiestHours')} 
                className="w-full"
              >
                {openPanel === 'busiestHours' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'busiestHours' && (
              <CardContent className="p-3 sm:p-6 pt-0">
                {(() => {
                  // Count appointments per hour per day to calculate average
                  const hourDayCounts: Record<number, Record<string, number>> = {};
                  
                  appointmentsData.forEach((apt: any) => {
                    const time = apt.appointment_time || "00:00";
                    const date = apt.appointment_date;
                    const [hours] = time.split(':').map(Number);
                    
                    if (!hourDayCounts[hours]) {
                      hourDayCounts[hours] = {};
                    }
                    if (!hourDayCounts[hours][date]) {
                      hourDayCounts[hours][date] = 0;
                    }
                    hourDayCounts[hours][date]++;
                  });
                  
                  // Create data array for chart with AVERAGE patients per hour
                  const chartData = [];
                  for (let hour = 10; hour <= 20; hour++) {
                    const daysWithAppointments = hourDayCounts[hour] ? Object.keys(hourDayCounts[hour]).length : 0;
                    const totalPatientsThisHour = hourDayCounts[hour] 
                      ? Object.values(hourDayCounts[hour]).reduce((sum, count) => sum + count, 0)
                      : 0;
                    const averagePatients = daysWithAppointments > 0 
                      ? (totalPatientsThisHour / daysWithAppointments)
                      : 0;
                    
                    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                    const period = hour >= 12 ? "PM" : "AM";
                    
                    chartData.push({
                      hour: `${displayHour}${period}`,
                      hourValue: hour,
                      patients: Math.round(averagePatients * 10) / 10, // Round to 1 decimal
                    });
                  }
                  
                  return chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => [`${value} avg patients`, 'Average']}
                          labelFormatter={(label) => `Hour: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Line 
                          type="monotone" 
                          dataKey="patients" 
                          stroke="hsl(200, 70%, 65%)" 
                          strokeWidth={2}
                          name="Avg Patients" 
                          dot={{ fill: "hsl(200, 70%, 65%)", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No data available</p>
                  );
                })()}
              </CardContent>
            )}
          </Card>

          {/* Age Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Age Distribution</CardTitle>
              {openPanel === 'ageDistribution' && (
                <DateFilterControls filter={ageFilter} setFilter={setAgeFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('ageDistribution')} 
                className="w-full"
              >
                {openPanel === 'ageDistribution' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'ageDistribution' && (
              <CardContent className="p-3 sm:p-6 pt-0">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const total = patientTypeData.reduce((s, i) => s + i.value, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return [`${value} (${percentage}%)`, capitalizeLabel(name)];
                        }} 
                      />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="value" fill="hsl(200, 70%, 65%)" name="Visits" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            )}
          </Card>

          {/* Patient Type Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Patient Type Distribution</CardTitle>
              {openPanel === 'patientType' && (
                <DateFilterControls filter={patientTypeFilter} setFilter={setPatientTypeFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('patientType')} 
                className="w-full"
              >
                {openPanel === 'patientType' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'patientType' && (
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
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {patientTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                          const total = patientTypeData.reduce((s, i) => s + i.value, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return [`${value} (${percentage}%)`, props.payload.name];
                        }}
                      />
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
            )}
           </Card>

          {/* Lab vs Normal Patient Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Normal vs Lab-Only Visits</CardTitle>
              {openPanel === 'labVsNormal' && (
                <DateFilterControls filter={labVsNormalFilter} setFilter={setLabVsNormalFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('labVsNormal')} 
                className="w-full"
              >
                {openPanel === 'labVsNormal' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'labVsNormal' && (
              <CardContent className="p-3 sm:p-6 pt-0">
                {labVsNormalData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={labVsNormalData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {labVsNormalData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                          const total = labVsNormalData.reduce((s, i) => s + i.value, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return [`${value} (${percentage}%)`, props.payload.name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    {(() => {
                      const total = labVsNormalData.reduce((s, i) => s + i.value, 0);
                      return labVsNormalData.map((item, idx) => (
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
            )}
           </Card>

          {/* Income Distribution Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Income Distribution</CardTitle>
              {openPanel === 'income' && (
                <DateFilterControls filter={incomeDistributionFilter} setFilter={setIncomeDistributionFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('income')} 
                className="w-full"
              >
                {openPanel === 'income' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'income' && (
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
                      <Tooltip 
                        formatter={(value: number) => {
                          const percentage = ((value / totalIncomeDistribution) * 100).toFixed(1);
                          return [`₹${value.toFixed(2)} (${percentage}%)`, 'Amount'];
                        }} 
                      />
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
            )}
           </Card>

          {/* Payment Method Distribution - Consultation */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Payment Method - Consultation</CardTitle>
              {openPanel === 'paymentConsultation' && (
                <DateFilterControls filter={paymentMethodFilter} setFilter={setPaymentMethodFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('paymentConsultation')} 
                className="w-full"
              >
                {openPanel === 'paymentConsultation' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'paymentConsultation' && (
              <CardContent className="p-3 sm:p-6 pt-0">
              {consultationPaymentMethodData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={consultationPaymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {consultationPaymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => {
                          const percentage = ((value / totalConsultationPayments) * 100).toFixed(1);
                          return [`₹${value.toFixed(2)} (${percentage}%)`, 'Amount'];
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    {consultationPaymentMethodData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto font-medium">{((item.value / totalConsultationPayments) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </CardContent>
            )}
           </Card>

          {/* Payment Method Distribution - Labs & Tests */}
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3">
              <CardTitle className="text-xl sm:text-2xl font-bold">Payment Method - Labs & Tests</CardTitle>
              {openPanel === 'paymentLabs' && (
                <DateFilterControls filter={paymentMethodFilter} setFilter={setPaymentMethodFilter} />
              )}
              <Button 
                variant="outline" 
                onClick={() => togglePanel('paymentLabs')} 
                className="w-full"
              >
                {openPanel === 'paymentLabs' ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {openPanel === 'paymentLabs' && (
              <CardContent className="p-3 sm:p-6 pt-0">
              {labsPaymentMethodData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={labsPaymentMethodData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 70 : 90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {labsPaymentMethodData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => {
                          const percentage = ((value / totalLabsPayments) * 100).toFixed(1);
                          return [`₹${value.toFixed(2)} (${percentage}%)`, 'Amount'];
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                    {labsPaymentMethodData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                        />
                        <span className="truncate">{item.name}</span>
                        <span className="ml-auto font-medium">{((item.value / totalLabsPayments) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                )}
              </CardContent>
            )}
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

        {/* Export & Clear Data Utility */}
        <div className="mt-8">
          <ExportClearUtility />
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
