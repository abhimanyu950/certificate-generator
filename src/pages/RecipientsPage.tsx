import React, { useState } from 'react';
import { useRecipientStore } from '../store/recipientStore';
import { AuditService } from '../services/audit.service';

export default function RecipientsPage() {
  const {
    recipients,
    selectedIds,
    searchQuery,
    statusFilter,
    addRecipient,
    deleteRecipient,
    clearRecipients,
    importCSV,
    toggleSelect,
    selectAll,
    clearSelection,
    setSearchQuery,
    setStatusFilter
  } = useRecipientStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCourse, setNewCourse] = useState('');

  // Filter logic
  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.course && r.course.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Valid' && r.status === 'sent') ||
      (statusFilter === 'Failed' && r.status === 'failed') ||
      (statusFilter === 'Pending' && r.status === 'pending');

    return matchesSearch && matchesStatus;
  });

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        importCSV(text);
        const importedCount = text.split('\n').filter((l) => l.trim()).length - 1;
        AuditService.logEvent({
          action: 'RECIPIENT_IMPORTED',
          userId: '',
          entityType: 'recipient',
          entityId: `import_${Date.now()}`,
          metadata: { count: importedCount > 0 ? importedCount : 0 }
        });
        alert('CSV imported successfully!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleDownloadSample = () => {
    const csvContent = 'name,email,course\nJohn Doe,john@example.com,Web Development\nJane Smith,jane@example.com,Data Science\nBob Johnson,bob@example.com,Graphic Design';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'recipients_sample.csv';
    link.click();
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      alert('Name and Email are required.');
      return;
    }
    addRecipient(newName, newEmail, newCourse);
    AuditService.logEvent({
      action: 'RECIPIENT_CREATED',
      userId: '',
      entityType: 'recipient',
      entityId: `rec_${Date.now()}`,
      metadata: { name: newName, email: newEmail, course: newCourse }
    });
    setNewName('');
    setNewEmail('');
    setNewCourse('');
    setShowAddModal(false);
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete the ${selectedIds.length} selected recipients?`)) {
      selectedIds.forEach(id => deleteRecipient(id));
      clearSelection();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Search & Actions Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant select-none">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-outline-variant rounded-full pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
              placeholder="Search recipients by name, email, or course..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 self-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-outline-variant rounded-lg px-3 py-2 text-xs focus:ring-secondary focus:border-secondary bg-white outline-none font-semibold text-on-surface-variant"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Valid">Valid (Sent)</option>
            <option value="Failed">Failed</option>
          </select>
          <label className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant hover:bg-surface-container-low transition-colors rounded-lg text-xs font-semibold cursor-pointer">
            <span className="material-symbols-outlined text-sm">upload_file</span>
            CSV Import
            <input type="file" hidden accept=".csv" onChange={handleCSVImport} />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:opacity-90 active:scale-95 text-white transition-all rounded-lg text-xs font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Add Recipient
          </button>
        </div>
      </section>

      {/* Bulk Actions Indicator */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/10 border border-secondary/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <span className="text-xs font-semibold text-secondary">{selectedIds.length} recipients selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold"
            >
              <span className="material-symbols-outlined text-xs">delete</span>
              Delete Selected
            </button>
            <button
              onClick={clearSelection}
              className="text-[11px] font-semibold text-on-surface-variant hover:underline px-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Recipients Table */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="p-4 w-10">
                  <input
                    checked={recipients.length > 0 && selectedIds.length === recipients.length}
                    onChange={(e) => selectAll(e.target.checked)}
                    className="rounded border-outline text-secondary focus:ring-secondary cursor-pointer"
                    type="checkbox"
                  />
                </th>
                <th className="p-4 font-label-code text-[10px] text-on-surface-variant uppercase tracking-wider">Name</th>
                <th className="p-4 font-label-code text-[10px] text-on-surface-variant uppercase tracking-wider">Email Address</th>
                <th className="p-4 font-label-code text-[10px] text-on-surface-variant uppercase tracking-wider">Course / Achievement</th>
                <th className="p-4 font-label-code text-[10px] text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="p-4 font-label-code text-[10px] text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-xs">
              {filteredRecipients.length > 0 ? (
                filteredRecipients.map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  return (
                    <tr key={r.id} className="hover:bg-surface-container-low/40 transition-colors group">
                      <td className="p-4">
                        <input
                          checked={isChecked}
                          onChange={() => toggleSelect(r.id)}
                          className="rounded border-outline text-secondary focus:ring-secondary cursor-pointer"
                          type="checkbox"
                        />
                      </td>
                      <td className="p-4 font-bold text-on-surface flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-secondary/10 text-secondary flex items-center justify-center font-bold text-[10px]">
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        {r.name}
                      </td>
                      <td className="p-4 text-on-surface-variant">{r.email}</td>
                      <td className="p-4">{r.course || '—'}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          r.status === 'sent' ? 'bg-green-100 text-green-800' :
                          r.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status === 'sent' ? 'valid' : r.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteRecipient(r.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all"
                          title="Delete Recipient"
                        >
                          <span className="material-symbols-outlined text-xs">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-on-surface-variant opacity-60">
                    <span className="material-symbols-outlined text-4xl">inbox</span>
                    <p className="text-xs mt-2">No recipients found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low/50 border-t border-outline-variant text-xs text-on-surface-variant font-semibold">
          <span>Total {filteredRecipients.length} recipients</span>
          <div className="flex gap-2">
            <button onClick={handleDownloadSample} className="text-secondary hover:underline font-bold">
              Download Sample CSV
            </button>
            <span>•</span>
            <button onClick={clearRecipients} className="text-red-600 hover:underline font-bold">
              Clear All Recipients
            </button>
          </div>
        </div>
      </div>

      {/* Add Recipient Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-bold text-sm text-on-surface">Add New Recipient</h3>
              <button className="p-1 hover:bg-surface-container-high rounded-full flex items-center" onClick={() => setShowAddModal(false)}>
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Full Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 focus:ring-1 focus:ring-secondary/50 outline-none bg-surface-container-low"
                  placeholder="e.g. John Doe"
                  type="text"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Email Address</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 focus:ring-1 focus:ring-secondary/50 outline-none bg-surface-container-low"
                  placeholder="john.doe@company.com"
                  type="email"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-on-surface-variant uppercase text-[10px]">Course / Achievement</label>
                <input
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 focus:ring-1 focus:ring-secondary/50 outline-none bg-surface-container-low"
                  placeholder="Leave blank to use default template setting"
                  type="text"
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-outline-variant font-semibold hover:bg-surface-container rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-secondary text-white font-bold hover:opacity-90 rounded-lg shadow-md"
                >
                  Save Recipient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
