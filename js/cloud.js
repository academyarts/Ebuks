/* cloud.js — E-Buks cloud identity and tenant-scoped sync.
   Existing local storage remains the offline source of truth. */
(() => {
  const CFG = window.EBUKS_CLOUD_CONFIG || {};
  let client = null, organizationId = localStorage.getItem('ebuks_org_id') || null;
  const ready = () => !!(window.supabase && CFG.url && CFG.publishableKey);
  const init = () => {
    if (!ready()) throw new Error('Cloud service is not configured.');
    if (!client) client = window.supabase.createClient(CFG.url, CFG.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  };
  async function currentUser() {
    const { data, error } = await init().auth.getUser();
    if (error) throw error;
    return data.user;
  }
  async function signUp(email, password, displayName) {
    const { data, error } = await init().auth.signUp({
      email, password, options: { data: { display_name: displayName || '' } }
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await init().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    const { error } = await init().auth.signOut();
    if (error) throw error;
    organizationId = null;
    localStorage.removeItem('ebuks_org_id');
  }
  async function ensureOrganization(name) {
    const sb = init(), user = await currentUser();
    if (!user) throw new Error('Sign in first.');
    if (organizationId) {
      const { data, error } = await sb.from('organization_members')
        .select('organization_id').eq('organization_id', organizationId)
        .eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (data) return organizationId;
      organizationId = null;
    }
    const { data: member, error: memberError } = await sb.from('organization_members')
      .select('organization_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (memberError) throw memberError;
    if (member) organizationId = member.organization_id;
    else {
      const { data: org, error } = await sb.from('organizations')
        .insert({ name: (name || 'My Business').trim(), created_by: user.id })
        .select('id').single();
      if (error) throw error;
      organizationId = org.id;
    }
    localStorage.setItem('ebuks_org_id', organizationId);
    return organizationId;
  }
  async function syncSimple(table, items, org) {
    const sb = init();
    const outgoing = (items || []).filter(x => x && x.id != null).map(x => ({
      organization_id: org, local_id: String(x.id), payload: x, version: 1
    }));
    if (outgoing.length) {
      const { error } = await sb.from(table).upsert(outgoing, { onConflict: 'organization_id,local_id' });
      if (error) throw error;
    }
    const { data, error } = await sb.from(table).select('local_id,payload')
      .eq('organization_id', org).is('deleted_at', null);
    if (error) throw error;
    const merged = new Map((items || []).filter(x => x && x.id != null).map(x => [String(x.id), x]));
    (data || []).forEach(row => { if (row.local_id && row.payload) merged.set(String(row.local_id), row.payload); });
    return Array.from(merged.values());
  }
  async function syncDocuments(docs, org) {
    const sb = init(), merged = {};
    for (const type of ['invoice','quotation','receipt','order','delivery']) {
      const items = (docs && docs[type]) || [];
      const outgoing = items.filter(x => x && x.id != null).map(x => ({
        organization_id: org, local_id: String(x.id), document_type: type, payload: x, version: 1
      }));
      if (outgoing.length) {
        const { error } = await sb.from('documents').upsert(outgoing, {
          onConflict: 'organization_id,local_id'
        });
        if (error) throw error;
      }
      const { data, error } = await sb.from('documents').select('local_id,payload')
        .eq('organization_id', org).eq('document_type', type).is('deleted_at', null);
      if (error) throw error;
      const map = new Map(items.filter(x => x && x.id != null).map(x => [String(x.id), x]));
      (data || []).forEach(row => { if (row.local_id && row.payload) map.set(String(row.local_id), row.payload); });
      merged[type] = Array.from(map.values());
    }
    return merged;
  }
  async function sync() {
    const sb = init(), user = await currentUser();
    if (!user) throw new Error('Sign in to enable cloud sync.');
    const org = await ensureOrganization((window.S && S.set && S.set.name) || 'My Business');
    const { error: brandError } = await sb.from('brand_profiles').upsert({
      organization_id: org, settings: S.set || {}
    }, { onConflict: 'organization_id' });
    if (brandError) throw brandError;
    const docs = await syncDocuments(S.docs || {}, org);
    const clients = await syncSimple('clients', S.clients, org);
    const products = await syncSimple('products', S.products, org);
    const expenses = await syncSimple('expenses', S.expenses, org);
    S = {...S, docs, clients, products, expenses};
    if (typeof save === 'function') save();
    return { organizationId: org, counts: {
      documents: Object.values(docs).reduce((n, a) => n + a.length, 0),
      clients: clients.length, products: products.length, expenses: expenses.length
    }};
  }
  window.EBCloud = { ready, init, currentUser, signUp, signIn, signOut, ensureOrganization, sync,
    get organizationId() { return organizationId; } };
})();