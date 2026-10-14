'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import Link from 'next/link';
import { ShoppingBag, Globe, Key, Webhook, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';

function IntegrationCard({
  title,
  description,
  icon: Icon,
  imageSrc,
  href,
  status,
  badge,
  lastSync,
}: {
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  imageSrc?: string;
  href: string;
  status?: 'connected' | 'disconnected' | null;
  badge?: string;
  lastSync?: string;
}) {
  return (
    <Link href={href} className="nano-card group flex flex-col justify-between hover:border-[var(--brand)] transition-all h-full">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          {imageSrc ? (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 p-1.5 shadow-xs shrink-0">
              <img src={imageSrc} alt={title} className="w-full h-full object-contain" />
            </div>
          ) : Icon ? (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          ) : null}

          {status && (
            <span className={`nano-pill ${status === 'connected' ? 'nano-pill-ok' : 'nano-pill-info'} inline-flex items-center gap-1 shrink-0`}>
              {status === 'connected' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {status === 'connected' ? 'Connected' : 'Not Connected'}
            </span>
          )}
          {badge && <span className="nano-pill nano-pill-brand shrink-0">{badge}</span>}
        </div>

        <h3 className="text-[15px] font-bold text-[var(--ink)] mb-1 group-hover:text-[var(--brand)] transition-colors">
          {title}
        </h3>

        <p className="text-[12px] text-[var(--muted)] leading-relaxed">{description}</p>
        {lastSync && (
          <p className="text-[11px] text-[var(--muted)] mt-2.5 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-[var(--brand)]" /> Last sync: {lastSync}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 text-[var(--brand)] text-[12px] font-semibold mt-4 pt-2.5 border-t border-[var(--line)]/50">
        Configure <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [shopifyStatus, setShopifyStatus] = useState<any>(null);
  const [growaxConfig, setGrowaxConfig] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/integrations/shopify/status').then(({ data }) => {
      if (data.success) setShopifyStatus(data.data);
    }).catch(() => {});

    apiClient.get('/integrations/storefront').then(({ data }) => {
      if (data.success) setConnections(data.data || []);
    }).catch(() => {});

    apiClient.get('/integrations/growax').then(({ data }) => {
      if (data.success) setGrowaxConfig(data.data);
    }).catch(() => {});
  }, []);

  const legacyShopify = connections.find(c => c.platform === 'shopify');
  const isShopifyConnected = (shopifyStatus?.connected && shopifyStatus?.status === 'connected') || legacyShopify?.status === 'connected';
  const shopifyLastSync = shopifyStatus?.last_synced_at || legacyShopify?.last_synced_at;
  const woo = connections.find(c => c.platform === 'woocommerce');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="nano-page-title">E-commerce & API integrations</h1>
        <p className="nano-page-subtitle">Connect your sales channels and developer APIs to automate order synchronization, webhooks, and live tracking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <IntegrationCard
          title="Growax WhatsApp"
          description="Automate WhatsApp notifications for Order Confirmation, Dispatched, Out for Delivery, NDR, and Delivered via Growax."
          imageSrc="/growax-icon.png"
          href="/integrations/growax"
          status={growaxConfig?.status === 'connected' && growaxConfig?.is_enabled ? 'connected' : 'disconnected'}
          badge={growaxConfig?.is_enabled ? 'Active' : undefined}
          lastSync={growaxConfig?.last_verified_at ? new Date(growaxConfig.last_verified_at).toLocaleString() : undefined}
        />
        <IntegrationCard
          title="Shopify Store"
          description="Sync orders, customer details, and inventory automatically via OAuth App or Custom App Access Token."
          imageSrc="/shopify-icon.png"
          href="/integrations/shopify"
          status={isShopifyConnected ? 'connected' : 'disconnected'}
          lastSync={shopifyLastSync ? new Date(shopifyLastSync).toLocaleString() : undefined}
        />
        <IntegrationCard
          title="WooCommerce Store"
          description="Connect your WordPress WooCommerce store via REST API credentials for real-time order pull."
          imageSrc="/woocommerce-icon.png"
          href="/integrations/woocommerce"
          status={woo?.status === 'connected' ? 'connected' : 'disconnected'}
          lastSync={woo?.last_synced_at ? new Date(woo.last_synced_at).toLocaleString() : undefined}
        />
        <IntegrationCard
          title="REST API Access Keys"
          description="Programmatically create orders, fetch rates, and track shipments via secure bearer token API."
          icon={Key}
          href="/integrations/api"
          badge="Developer"
        />
        <IntegrationCard
          title="Webhook Notifications"
          description="Receive real-time HTTP callbacks for status changes, NDR events, and delivery confirmations."
          icon={Webhook}
          href="/integrations/webhooks"
          badge="Real-time"
        />
      </div>
    </div>
  );
}
