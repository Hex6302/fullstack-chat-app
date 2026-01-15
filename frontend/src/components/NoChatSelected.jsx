import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-8">
      <div className="max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;
