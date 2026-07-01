export default function AprobareLayout({ children }) {
  return (
    <>
      {/* Hide the internal navigation on the public approval page */}
      <style dangerouslySetInnerHTML={{ __html: 'body > nav { display: none !important; }' }} />
      {children}
    </>
  );
}
