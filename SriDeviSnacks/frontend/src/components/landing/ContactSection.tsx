import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    
    setStatus('loading');
    try {
      const response = await fetch('/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (err) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };
  return (
    <section id="contact" className="py-24 bg-gray-50 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-bold text-[#8B0000] tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
            <span className="w-8 h-0.5 bg-[#8B0000]"></span> Reach Out <span className="w-8 h-0.5 bg-[#8B0000]"></span>
          </h2>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">Get in Touch</h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Have questions about our snacks, bulk orders, or shipping? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          
          {/* Contact Information */}
          <div className="bg-white rounded-3xl p-10 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-extrabold text-gray-900 mb-8 border-b-2 border-[#8B0000] pb-2 inline-block">Contact Information</h3>
            <div className="space-y-8">
              <div className="flex items-start">
                <div className="bg-[#fffdf8] p-4 rounded-full shadow-sm mr-6 border border-gray-100">
                  <MapPin className="h-6 w-6 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Our Location</h4>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    128c, Santhanamari Amman Kovil Street,<br />
                    Vallioor, Tirunelveli - 627117,<br />
                    Tamil Nadu
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-[#fffdf8] p-4 rounded-full shadow-sm mr-6 border border-gray-100">
                  <Phone className="h-6 w-6 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Phone Number</h4>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    +91 88078 10021<br />
                    +91 99432 06339
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-[#fffdf8] p-4 rounded-full shadow-sm mr-6 border border-gray-100">
                  <Mail className="h-6 w-6 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Email Address</h4>
                  <p className="text-gray-600 leading-relaxed font-medium">info@sridevisnacks.com</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-[#fffdf8] p-4 rounded-full shadow-sm mr-6 border border-gray-100">
                  <Clock className="h-6 w-6 text-[#8B0000]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Working Hours</h4>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    Monday - Sunday<br />
                    9:00 AM - 9:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700] rounded-bl-full opacity-20"></div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-8 border-b-2 border-[#8B0000] pb-2 inline-block relative z-10">Send us a Message</h3>
            <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition-colors bg-gray-50"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition-colors bg-gray-50"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition-colors bg-gray-50"
                  placeholder="Bulk Order Inquiry"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] transition-colors resize-none bg-gray-50"
                  placeholder="Tell us what you need..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#8B0000] hover:bg-[#600000] disabled:opacity-70 text-white font-bold py-4 px-8 rounded-xl transition duration-300 flex items-center justify-center space-x-2 shadow-lg tracking-wider"
              >
                <span>{status === 'loading' ? 'Sending...' : 'Send Message'}</span>
                <Send className="h-5 w-5" />
              </button>

              {status === 'success' && (
                <div className="flex items-center text-green-700 bg-green-50 p-4 rounded-lg font-bold border border-green-200">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <p>Message sent successfully! We'll get back to you soon.</p>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center text-red-700 bg-red-50 p-4 rounded-lg font-bold border border-red-200">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <p>Failed to send message. Please try again or call us.</p>
                </div>
              )}
            </form>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ContactSection;
