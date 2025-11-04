import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

export default function FuelStatistics() {
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState("all");
  
  const { data: statistics, isLoading } = useQuery({
    queryKey: ["/api/fuel-refills/statistics", selectedYear, selectedMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear !== "all") params.append("year", selectedYear);
      if (selectedMonth !== "all") params.append("month", selectedMonth);
      
      const response = await fetch(`/api/fuel-refills/statistics?${params.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
  });

  const years = Array.from({ length: 5 }, (_, i) => (parseInt(currentYear) - i).toString());
  const months = [
    { value: "01", label: "Gennaio" },
    { value: "02", label: "Febbraio" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Aprile" },
    { value: "05", label: "Maggio" },
    { value: "06", label: "Giugno" },
    { value: "07", label: "Luglio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" },
  ];

  const monthNames: Record<string, string> = {
    "01": "Gen", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "Mag", "06": "Giu", "07": "Lug", "08": "Ago",
    "09": "Set", "10": "Ott", "11": "Nov", "12": "Dic"
  };

  return (
    <div className="space-y-6">
      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtri Periodo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Anno</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-stats-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli anni</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Mese</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger data-testid="select-stats-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i mesi</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento statistiche...</div>
      ) : !statistics ? (
        <div className="text-center py-12 text-muted-foreground">Nessun dato disponibile</div>
      ) : (
        <>
          {/* Consumi per Mezzo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Consumi per Mezzo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.byVehicle && statistics.byVehicle.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={statistics.byVehicle}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="vehicleName" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalLiters" fill="hsl(var(--primary))" name="Litri Totali" />
                    <Bar dataKey="refillCount" fill="hsl(var(--secondary))" name="N° Rifornimenti" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nessun dato disponibile per il periodo selezionato
                </div>
              )}
            </CardContent>
          </Card>

          {/* Andamento Mensile */}
          {selectedMonth === "all" && statistics.byMonth && statistics.byMonth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Andamento Erogazioni nel Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={statistics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month"
                      tickFormatter={(value) => monthNames[value] || value}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `${monthNames[value as string] || value}`}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalLiters" 
                      stroke="hsl(var(--primary))" 
                      name="Litri Erogati"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="refillCount" 
                      stroke="hsl(var(--secondary))" 
                      name="N° Rifornimenti"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabella Riepilogo per Mezzo */}
          {statistics.byVehicle && statistics.byVehicle.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riepilogo Dettagliato per Mezzo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">Mezzo</th>
                        <th className="p-3 text-right font-medium">Litri Totali</th>
                        <th className="p-3 text-right font-medium">N° Rifornimenti</th>
                        <th className="p-3 text-right font-medium">Media per Rifornimento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.byVehicle.map((vehicle: any) => (
                        <tr key={vehicle.vehicleId} className="border-b" data-testid={`row-stats-vehicle-${vehicle.vehicleId}`}>
                          <td className="p-3">{vehicle.vehicleName}</td>
                          <td className="p-3 text-right font-medium">{vehicle.totalLiters.toFixed(2)} L</td>
                          <td className="p-3 text-right">{vehicle.refillCount}</td>
                          <td className="p-3 text-right">
                            {vehicle.refillCount > 0 
                              ? (vehicle.totalLiters / vehicle.refillCount).toFixed(2) 
                              : "0.00"} L
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
