'use strict';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, RefreshCw, Send,
  Copy, Check, ShieldCheck, Key, Globe, Phone, MessageSquare, Save,
  ListFilter, RotateCcw, HelpCircle, ExternalLink, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'connection' | 'templates' | 'logs' | 'webhook';

interface TemplateItem {
  event_key: string;
  label: string;
  description: string;
  growax_template_name: string;
  language: string;
  variable_mapping: Record<string, string>;
  is_enabled: boolean;
  sample_preview: string;
}

export default function GrowaxIntegrationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('connection');
  const [loading, setLoading] = useState(true);

  // Config State
  const [config, setConfig] = useState<any>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('https://crm.growax.in');
  const [apiKey, setApiKey] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [brandName, setBrandName] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Test Connection & Message State
  const [testingConn, setTestingConn] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [savingSingleIdx, setSavingSingleIdx] = useState<number | null>(null);

  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  // Webhook copied state
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Load Config
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/integrations/growax');
      if (res.data?.success && res.data?.data) {
        const c = res.data.data;
        setConfig(c);
        setApiBaseUrl(c.api_base_url || 'https://crm.growax.in');
        setSenderNumber(c.sender_number || '');
        setBrandName(c.brand_name || '');
        setIsEnabled(Boolean(c.is_enabled));
      }
    } catch (err: any) {
      toast.error('Failed to load Growax configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Templates
  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const res = await apiClient.get('/integrations/growax/templates');
      if (res.data?.success) {
        setTemplates(res.data.data || []);
      }
    } catch (err: any) {
      toast.error('Failed to load message templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Load Logs
  const loadLogs = useCallback(async (page = 1, status = logFilterStatus, search = logSearch) => {
    try {
      setLoadingLogs(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '20');
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const res = await apiClient.get(`/integrations/growax/logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setLogTotalPages(res.data.data.pagination?.totalPages || 1);
        setLogPage(page);
      }
    } catch (err: any) {
      toast.error('Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, [logFilterStatus, logSearch]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'logs') {
      loadLogs(1);
    }
  }, [activeTab, loadTemplates, loadLogs]);

  // Handle Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: any = {
        api_base_url: apiBaseUrl,
        sender_number: senderNumber,
        brand_name: brandName,
        is_enabled: isEnabled,
      };
      if (apiKey && !apiKey.includes('••••')) {
        payload.api_key = apiKey;
      }
      const res = await apiClient.post('/integrations/growax', payload);
      if (res.data?.success) {
        toast.success('Growax settings saved successfully');
        setConfig(res.data.data);
        setApiKey('');
      } else {
        toast.error(res.data?.error?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Toggle Switch
  const handleToggle = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    try {
      const res = await apiClient.patch('/integrations/growax/toggle', { is_enabled: nextState });
      if (res.data?.success) {
        toast.success(nextState ? 'Growax WhatsApp alerts enabled' : 'Growax WhatsApp alerts paused');
        setConfig((prev: any) => ({ ...prev, is_enabled: nextState }));
      }
    } catch (err: any) {
      setIsEnabled(!nextState);
      toast.error('Failed to toggle status');
    }
  };

  // Handle Test Connection
  const handleTestConnection = async () => {
    setTestingConn(true);
    try {
      const res = await apiClient.post('/integrations/growax/test', {});
      if (res.data?.success && res.data?.data?.success) {
        toast.success('Connection to Growax verified successfully!');
        setConfig((prev: any) => ({ ...prev, status: 'connected', last_verified_at: new Date().toISOString() }));
      } else {
        toast.error(res.data?.data?.connection?.message || 'Connection check failed. Please verify API key.');
        setConfig((prev: any) => ({ ...prev, status: 'failed' }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Test connection failed');
      setConfig((prev: any) => ({ ...prev, status: 'failed' }));
    } finally {
      setTestingConn(false);
    }
  };

  // Handle Send Test Message
  const handleSendTestMessage = async () => {
    if (!testPhone || testPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setSendingTest(true);
    try {
      const res = await apiClient.post('/integrations/growax/test', {
        testPhone: testPhone.trim(),
        testMessage: `Test alert from ${brandName || 'Nanoshipy'} via Growax WhatsApp API. If you received this, your integration is 100% active!`,
      });
      if (res.data?.success && res.data?.data?.testMessage?.success) {
        toast.success(`Test WhatsApp message sent to ${testPhone}! Check your phone.`);
        setConfig((prev: any) => ({ ...prev, status: 'connected' }));
      } else {
        toast.error(res.data?.data?.testMessage?.error || 'Failed to dispatch test message.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Error sending test message');
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Template Item Change
  const updateTemplateField = (index: number, field: keyof TemplateItem, value: any) => {
    setTemplates((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Save All Templates
  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const payload = templates.map((t) => ({
        event_key: t.event_key,
        growax_template_name: (t.growax_template_name || '').trim(),
        template_id: (t.growax_template_name || '').trim(),
        language: (t.language || 'en').trim(),
        variable_mapping: t.variable_mapping || {},
        is_enabled: Boolean(t.is_enabled),
      }));

      const res = await apiClient.put('/integrations/growax/templates', { templates: payload });
      if (res.data?.success) {
        toast.success('All templates saved successfully!');
        setTemplates(res.data.data || []);
      } else {
        toast.error(res.data?.error?.message || 'Failed to save templates');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to save templates');
    } finally {
      setSavingTemplates(false);
    }
  };

  // Save Single Template
  const handleSaveSingleTemplate = async (idx: number) => {
    setSavingSingleIdx(idx);
    try {
      const payload = templates.map((t) => ({
        event_key: t.event_key,
        growax_template_name: (t.growax_template_name || '').trim(),
        template_id: (t.growax_template_name || '').trim(),
        language: (t.language || 'en').trim(),
        variable_mapping: t.variable_mapping || {},
        is_enabled: Boolean(t.is_enabled),
      }));

      const res = await apiClient.put('/integrations/growax/templates', { templates: payload });
      if (res.data?.success) {
        toast.success(`Template "${templates[idx]?.label}" saved!`);
        setTemplates(res.data.data || []);
      } else {
        toast.error(res.data?.error?.message || 'Failed to save template');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to save template');
    } finally {
      setSavingSingleIdx(null);
    }
  };

  // Retry Failed Message
  const handleRetry = async (logId: string) => {
    setRetryingLogId(logId);
    try {
      const res = await apiClient.post(`/integrations/growax/logs/${logId}/retry`);
      if (res.data?.success) {
        toast.success('Message requeued for background dispatch');
        loadLogs(logPage);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to retry message');
    } finally {
      setRetryingLogId(null);
    }
  };

  const fullWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/webhooks/growax/${config?.seller_id || ''}`
    : `https://api.nanoshipy.com/api/v1/webhooks/growax/${config?.seller_id || ''}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Integrations
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/60 p-2 shadow-xs shrink-0">
              <img src="/growax-icon.png" alt="Growax WhatsApp" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] tracking-tight">
                  Growax WhatsApp Integration
                </h1>
                {config && (
                  <span
                    className={`nano-pill inline-flex items-center gap-1 text-[11px] font-semibold ${
                      config.status === 'connected' && config.is_enabled
                        ? 'nano-pill-ok'
                        : config.status === 'failed'
                        ? 'nano-pill-danger'
                        : 'nano-pill-info'
                    }`}
                  >
                    {config.status === 'connected' && config.is_enabled ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {config.status === 'connected' && config.is_enabled
                      ? 'Connected & Active'
                      : config.status === 'failed'
                      ? 'Failed'
                      : 'Not Connected'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
                Send automated buyer WhatsApp alerts for orders, shipments, tracking milestones & NDR via your Growax account.
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Toggle */}
          <div className="flex items-center gap-3 bg-[var(--brand-soft)]/40 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-[var(--line)] self-start sm:self-auto">
            <span className="text-xs font-semibold text-[var(--ink)]">
              {isEnabled ? 'Integration Active' : 'Integration Paused'}
            </span>
            <button
              type="button"
              onClick={handleToggle}
              className={`p-1 transition-colors rounded-lg ${isEnabled ? 'text-[var(--brand)]' : 'text-slate-400'}`}
              title={isEnabled ? 'Click to Pause' : 'Click to Enable'}
            >
              {isEnabled ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[var(--line)] overflow-x-auto pb-px">
        {[
          { key: 'connection', label: 'Connection', icon: Key },
          { key: 'templates', label: 'Message Templates', icon: MessageSquare },
          { key: 'logs', label: 'Message Logs', icon: ListFilter },
          { key: 'webhook', label: 'Webhook & Setup', icon: Globe },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === key
                ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--brand-soft)]/20'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CONNECTION SETTINGS                                */}
      {/* ========================================================= */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveConfig} className="nano-card space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]/60">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Key className="w-4 h-4 text-[var(--brand)]" /> Growax API Credentials
                </h3>
                <span className="text-[11px] text-[var(--muted)]">Encrypted at rest with AES-256</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Growax API Base URL
                  </label>
                  <input
                    type="url"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="https://crm.growax.in"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                    required
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">Default: https://crm.growax.in</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                    Growax Connection Key (Channel API Key)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={config?.has_api_key ? config.api_key_masked : 'Enter your Growax Connection Key'}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 font-mono"
                  />
                  <p className="text-[11px] text-[var(--muted)] mt-1">
                    {config?.has_api_key
                      ? 'Current token configured. Leave blank to keep existing, or type a new key to update.'
                      : 'Copy the Connection Key from your Growax CRM (crm.growax.in): WhatsApp Inboxes -> Connections -> Connection Key.'}
                  </p>
                </div>

                {config?.status === 'failed' && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">Growax Connection Notice</p>
                      <p className="text-[11px] leading-relaxed">
                        Growax returned <code>&quot;Invalid connection key&quot;</code>. In your Growax dashboard, please open your <strong>WhatsApp Inbox/Connection</strong>, copy the active <strong>Connection Key</strong> (formatted as <code>Bearer &lt;connection-key&gt;</code>), and paste it above.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                      Sender WhatsApp Number / Phone ID
                    </label>
                    <input
                      type="text"
                      value={senderNumber}
                      onChange={(e) => setSenderNumber(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                    />
                    <p className="text-[11px] text-[var(--muted)] mt-1">Your registered WhatsApp Business Number or Channel ID.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--ink)] mb-1.5">
                      Sender Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. MyStore"
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                    />
                    <p className="text-[11px] text-[var(--muted)] mt-1">Included in template placeholders as {'{{brand_name}}'}.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]/60">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConn || !config?.has_api_key && !apiKey}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] text-[var(--ink)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--brand)] text-white hover:brightness-105 transition-all shadow-xs disabled:opacity-50"
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>

            {/* Test Message Dispatch Box */}
            <div className="nano-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                  <Send className="w-4 h-4 text-[var(--brand)]" /> Dispatch Live WhatsApp Test Message
                </h3>
                <button
                  type="button"
                  onClick={() => setTestPhone('9150826341')}
                  className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
                >
                  Prefill Phone (9150826341)
                </button>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Send a real test message to verify that WhatsApp delivery works through your Growax account.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile (e.g. 9150826341)"
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30"
                />
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest || !testPhone}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-colors disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingTest ? 'animate-spin' : ''}`} />
                  {sendingTest ? 'Sending...' : 'Send Test Message'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guide & Status Side Card */}
          <div className="space-y-4">
            <div className="nano-card space-y-3.5">
              <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Security Guarantee
              </h4>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Your API token is stored securely encrypted using <strong>AES-256-GCM</strong>. Tokens are never exposed in plaintext to the frontend or written to server access logs.
              </p>
              <ul className="text-xs text-[var(--muted)] space-y-2 list-disc list-inside">
                <li>Isolated to your merchant account</li>
                <li>Zero impact on courier booking/billing flows</li>
                <li>Non-blocking asynchronous background execution</li>
              </ul>
            </div>

            <div className="nano-card space-y-3">
              <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                Connection Status
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="text-[var(--muted)]">Status:</span>
                  <span className="font-semibold text-[var(--ink)] capitalize">{config?.status || 'Not Configured'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[var(--line)]/50">
                  <span className="text-[var(--muted)]">Alerts Active:</span>
                  <span className="font-semibold text-[var(--ink)]">{config?.is_enabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--muted)]">Last Verified:</span>
                  <span className="font-medium text-[var(--ink)]">
                    {config?.last_verified_at ? new Date(config.last_verified_at).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MESSAGE TEMPLATES CONFIGURATION                    */}
      {/* ========================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--ink)]">
                Milestone Alert Templates
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Select which shipping events trigger WhatsApp alerts and map your approved Growax template names.
              </p>
            </div>
            <button
              onClick={handleSaveTemplates}
              disabled={savingTemplates}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[var(--brand)] text-white hover:brightness-105 transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto"
            >
              {savingTemplates ? 'Saving...' : 'Save All Templates'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {templates.map((tpl, idx) => (
              <div
                key={tpl.event_key}
                className={`nano-card transition-all border ${
                  tpl.is_enabled ? 'border-[var(--brand)]/40 bg-[var(--brand-soft)]/5' : 'border-[var(--line)]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between md:justify-start gap-3">
                      <span className="text-sm font-bold text-[var(--ink)]">{tpl.label}</span>
                      <button
                        type="button"
                        onClick={() => updateTemplateField(idx, 'is_enabled', !tpl.is_enabled)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                          tpl.is_enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {tpl.is_enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {tpl.is_enabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--muted)]">{tpl.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
                          Growax Template Name / ID
                        </label>
                        <input
                          type="text"
                          value={tpl.growax_template_name}
                          onChange={(e) => updateTemplateField(idx, 'growax_template_name', e.target.value)}
                          placeholder="e.g. order_shipped_v1"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--ink)] mb-1">
                          Language Code
                        </label>
                        <input
                          type="text"
                          value={tpl.language}
                          onChange={(e) => updateTemplateField(idx, 'language', e.target.value)}
                          placeholder="en"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--line)]/50">
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--muted)]">Available Variable Tags:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {['customer_name', 'order_id', 'awb', 'courier_name', 'tracking_link', 'brand_name'].map((v) => (
                            <span
                              key={v}
                              className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveSingleTemplate(idx)}
                        disabled={savingSingleIdx === idx}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-colors shrink-0 shadow-2xs disabled:opacity-50 self-start sm:self-auto cursor-pointer"
                      >
                        <Save className={`w-3.5 h-3.5 ${savingSingleIdx === idx ? 'animate-spin' : ''}`} />
                        {savingSingleIdx === idx ? 'Saving...' : 'Save Template'}
                      </button>
                    </div>
                  </div>

                  {/* Sample WhatsApp bubble preview */}
                  <div className="w-full md:w-72 bg-[#e5ddd5]/30 dark:bg-slate-900/60 p-3 rounded-xl border border-[var(--line)] shrink-0 self-center md:self-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Sample WhatsApp Preview
                    </span>
                    <div className="bg-white dark:bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-lg shadow-2xs text-[11px] leading-relaxed text-[var(--ink)]">
                      {tpl.sample_preview}
                      <span className="block text-[9px] text-right text-slate-400 mt-1">10:45 AM ✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MESSAGE TRANSMISSION LOGS                          */}
      {/* ========================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="nano-card flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadLogs(1, logFilterStatus, logSearch)}
                placeholder="Search by AWB or Phone Number..."
                className="text-xs px-3.5 py-2 rounded-lg border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)] min-w-[220px]"
              />
              <select
                value={logFilterStatus}
                onChange={(e) => {
                  setLogFilterStatus(e.target.value);
                  loadLogs(1, e.target.value, logSearch);
                }}
                className="text-xs px-3 py-2 rounded-lg border border-[var(--line)] bg-white dark:bg-slate-900 text-[var(--ink)]"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <button
              onClick={() => loadLogs(1, logFilterStatus, logSearch)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="nano-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--line)] text-[var(--muted)] font-semibold">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Recipient Phone</th>
                    <th className="py-3 px-4">Milestone</th>
                    <th className="py-3 px-4">AWB / Order</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]/60 text-[var(--ink)]">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--brand)]" />
                        Loading message logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[var(--muted)]">
                        No Growax message logs found. Outgoing WhatsApp notifications will appear here.
                      </td>
                    </tr>
                  ) : (
                    logs.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-[var(--muted)]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {item.to_number}
                        </td>
                        <td className="py-3 px-4 font-semibold capitalize">
                          {item.event_key.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {item.awb || item.order_id?.slice(0, 8) || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`nano-pill text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'delivered' || item.status === 'read'
                                ? 'nano-pill-ok'
                                : item.status === 'sent'
                                ? 'nano-pill-brand'
                                : item.status === 'failed'
                                ? 'nano-pill-danger'
                                : 'nano-pill-info'
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.error_message && (
                            <p className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[200px]" title={item.error_message}>
                              {item.error_message}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingLogId === item.id}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand)] hover:underline"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingLogId === item.id ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logTotalPages > 1 && (
              <div className="p-3 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Page {logPage} of {logTotalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={logPage <= 1}
                    onClick={() => loadLogs(logPage - 1)}
                    className="px-2.5 py-1 rounded border border-[var(--line)] disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={logPage >= logTotalPages}
                    onClick={() => loadLogs(logPage + 1)}
                    className="px-2.5 py-1 rounded border border-[var(--line)] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: WEBHOOK & SETUP INSTRUCTIONS                       */}
      {/* ========================================================= */}
      {activeTab === 'webhook' && (
        <div className="space-y-6">
          <div className="nano-card space-y-4">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[var(--brand)]" /> Your Unique Delivery Callback Webhook
            </h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              To track message delivery and read receipts in real-time on Nanoshipy, configure this webhook callback URL in your Growax WhatsApp portal.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
                Webhook Callback Endpoint URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={fullWebhookUrl}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-slate-50 dark:bg-slate-900 text-[var(--ink)] font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullWebhookUrl);
                    setCopiedWebhook(true);
                    toast.success('Webhook URL copied to clipboard');
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copiedWebhook ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {config?.webhook_secret && (
              <div>
                <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
                  Webhook Secret (For HMAC / Signature Verification)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config.webhook_secret}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-[var(--line)] bg-slate-50 dark:bg-slate-900 text-[var(--muted)] font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(config.webhook_secret);
                      setCopiedSecret(true);
                      toast.success('Webhook Secret copied');
                      setTimeout(() => setCopiedSecret(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="nano-card space-y-4">
            <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[var(--brand)]" /> How to Setup Growax in 3 Simple Steps
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--line)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-[var(--ink)]">Enter Growax Credentials</h4>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Go to the <strong>Connection</strong> tab. Enter your Growax API Key, sender WhatsApp number, and brand name. Click <strong>Test Connection</strong> to verify.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--line)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold shrink-0">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-[var(--ink)]">Configure Message Templates</h4>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Navigate to <strong>Message Templates</strong>. Enable the shipping milestones you want to alert on and enter your approved Growax template names.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-[var(--line)]">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold shrink-0">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-[var(--ink)]">Paste the Webhook Callback in Growax</h4>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    Copy the Webhook URL above. In your Growax dashboard, navigate to <strong>Settings &gt; Webhooks</strong>, paste this URL, and save.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
