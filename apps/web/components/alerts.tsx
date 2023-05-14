export interface Alert {
  message: string;
  type: number;
}

export const Alerts = ({ alertsList }: { alertsList: Array<Alert> }) => {
  return (
    <div className="absolute right-6 top-6 flex flex-col rounded-lg bg-red-200 p-8">
      {alertsList.map((alert, index) => {
        return (
          <h1 key={index} className="text-xs font-semibold">
            Error: {alert.message}
          </h1>
        );
      })}
    </div>
  );
};
