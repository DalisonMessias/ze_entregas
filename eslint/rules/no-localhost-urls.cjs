module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Proíbe URLs locais fixas (localhost, 127.0.0.1, portas fixas)'
    },
    messages: {
      noLocalhost: 'URL local fixa detectada: {{value}}'
    },
    schema: []
  },
  create(context) {
    function checkValue(value, node) {
      if (typeof value !== 'string') return;
      const s = value;
      const hasLocal = /https?:\/\/localhost/i.test(s) || /https?:\/\/127\.0\.0\.1/i.test(s);
      const hasManualPort = /(https?:\/\/[^\s/'"`]+:\d{2,5})/.test(s);
      if (hasLocal || hasManualPort) {
        context.report({ node, messageId: 'noLocalhost', data: { value: s } });
      }
    }
    return {
      Literal(node) {
        checkValue(node.value, node);
      },
      TemplateLiteral(node) {
        const quasisText = node.quasis.map(q => q.value && q.value.cooked).filter(Boolean).join('');
        checkValue(quasisText, node);
      }
    };
  }
};
