import DailyReportForm from "../DailyReportForm";

export default function DailyReportFormExample() {
  const handleSubmit = (operations: any[]) => {
    console.log("Daily report submitted with operations:", operations);
    alert(`Rapportino inviato con ${operations.length} operazioni!`);
  };

  return (
    <DailyReportForm
      employeeName="Marco Rossi"
      date="15 Marzo 2024"
      onSubmit={handleSubmit}
    />
  );
}