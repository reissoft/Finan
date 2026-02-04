"use client";

import { Crown, Star, Check, X } from "lucide-react";

interface ProFeatureBlockProps {
  feature: string;
  description: string;
  benefits: string[];
  onUpgrade?: () => void;
  onClose?: () => void;
  compact?: boolean; // Versão menor se true
}

export function ProFeatureBlock({
  feature,
  description,
  benefits,
  onUpgrade,
  onClose,
  compact = false,
}: ProFeatureBlockProps) {
  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Redirecionar para página de upgrade
      window.open("/settings?upgrade=pro", "_blank");
    }
  };

  const containerClass = compact
    ? "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 text-center relative"
    : "bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center relative";

  return (
    <div className={containerClass}>
      {/* Botão X para fechar */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/50 hover:text-gray-600"
          title="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="mb-4 flex justify-center">
        <div className="rounded-full bg-amber-100 p-3">
          <Crown
            className={`${compact ? "h-6 w-6" : "h-8 w-8"} text-amber-600`}
          />
        </div>
      </div>

      <h3
        className={`${compact ? "text-lg" : "text-xl"} mb-2 font-bold text-gray-800`}
      >
        {feature} Exclusivo Plano PRO
      </h3>

      <p
        className={`mx-auto mb-6 max-w-md text-gray-600 ${compact ? "text-sm" : ""}`}
      >
        {description}
      </p>

      <div className="mb-6 rounded-lg border border-amber-200 bg-white p-4">
        <h4
          className={`mb-3 flex items-center gap-2 font-semibold text-gray-800 ${compact ? "text-sm" : ""}`}
        >
          <Star className="h-5 w-5 text-amber-500" />
          Benefícios do Plano PRO:
        </h4>
        <ul
          className={`${compact ? "text-xs" : "text-sm"} mx-auto max-w-sm space-y-2 text-left text-gray-600`}
        >
          {benefits
            .slice(0, compact ? 3 : benefits.length)
            .map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                <span>{benefit}</span>
              </li>
            ))}
          {compact && benefits.length > 3 && (
            <li className="text-gray-400">
              ...e {benefits.length - 3} benefícios mais
            </li>
          )}
        </ul>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div
            className={`${compact ? "text-2xl" : "text-3xl"} font-bold text-amber-600`}
          >
            R$ 49,90
          </div>
          <div className="text-sm text-gray-500">por mês</div>
        </div>
        <button
          onClick={handleUpgrade}
          className={`flex transform items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white shadow-lg transition-all hover:scale-105 hover:from-amber-600 hover:to-orange-600 hover:shadow-amber-500/25 ${compact ? "px-6 py-2 text-sm" : "px-8 py-3"}`}
        >
          <Crown className="h-5 w-5" />
          Fazer Upgrade para PRO
        </button>
      </div>

      <p
        className={`mt-4 flex items-center justify-center gap-1 text-gray-500 ${compact ? "text-xs" : ""}`}
      >
        Recurso bloqueado para usuários do plano gratuito
      </p>
    </div>
  );
}
