<?php
/**
 * Plugin Name: RPM Assure Embed
 * Description: Pulls estate / customer health from RPM Assure into any WordPress template via shortcode.
 * Version: 1.0.0
 * Author: RPM Resources
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', function () {
    add_options_page('RPM Assure', 'RPM Assure', 'manage_options', 'rpm-assure', 'rpm_assure_settings_page');
});

add_action('admin_init', function () {
    register_setting('rpm_assure', 'rpm_assure_url');
    register_setting('rpm_assure', 'rpm_assure_token');
});

function rpm_assure_settings_page()
{
    echo '<div class="wrap"><h1>RPM Assure</h1><form method="post" action="options.php">';
    settings_fields('rpm_assure');
    echo '<table class="form-table">';
    echo '<tr><th>Assure URL</th><td><input class="regular-text" name="rpm_assure_url" value="' . esc_attr(get_option('rpm_assure_url')) . '" placeholder="https://assure.yourdomain" /></td></tr>';
    echo '<tr><th>API token</th><td><input class="regular-text" type="password" name="rpm_assure_token" value="' . esc_attr(get_option('rpm_assure_token')) . '" /></td></tr>';
    echo '</table>';
    submit_button();
    echo '<p>Shortcodes:</p><ul>';
    echo '<li><code>[rpm_assure_estate]</code> — full estate RAG cards</li>';
    echo '<li><code>[rpm_assure_estate code="SIRF"]</code> — one customer</li>';
    echo '</ul></form></div>';
}

function rpm_assure_fetch($code = '')
{
    $base = rtrim((string) get_option('rpm_assure_url'), '/');
    $token = (string) get_option('rpm_assure_token');
    if ($base === '' || $token === '') {
        return ['ok' => false, 'error' => 'Set Assure URL and token in Settings → RPM Assure'];
    }
    $url = $base . '/api/wp/estate?token=' . rawurlencode($token);
    if ($code !== '') {
        $url .= '&code=' . rawurlencode($code);
    }
    $cache_key = 'rpm_assure_' . md5($url);
    $cached = get_transient($cache_key);
    if (is_array($cached)) {
        return $cached;
    }
    $res = wp_remote_get($url, ['timeout' => 12]);
    if (is_wp_error($res)) {
        return ['ok' => false, 'error' => $res->get_error_message()];
    }
    $body = json_decode(wp_remote_retrieve_body($res), true);
    if (!is_array($body)) {
        return ['ok' => false, 'error' => 'Invalid JSON from Assure'];
    }
    set_transient($cache_key, $body, 5 * MINUTE_IN_SECONDS);
    return $body;
}

function rpm_assure_render($atts)
{
    $atts = shortcode_atts(['code' => ''], $atts);
    $data = rpm_assure_fetch($atts['code']);
    if (empty($data['ok'])) {
        return '<p class="rpm-assure-err">' . esc_html($data['error'] ?? 'Unavailable') . '</p>';
    }
    $t = $data['totals'] ?? ['n' => 0, 'green' => 0, 'amber' => 0, 'red' => 0];
    ob_start();
    ?>
    <div class="rpm-assure">
      <div class="rpm-assure-kpis">
        <div class="rpm-kpi"><span><?php echo (int) $t['n']; ?></span>customers</div>
        <div class="rpm-kpi is-g"><span><?php echo (int) $t['green']; ?></span>green</div>
        <div class="rpm-kpi is-a"><span><?php echo (int) $t['amber']; ?></span>amber</div>
        <div class="rpm-kpi is-r"><span><?php echo (int) $t['red']; ?></span>red</div>
      </div>
      <div class="rpm-assure-grid">
        <?php foreach (($data['customers'] ?? []) as $c) :
            $rag = strtolower((string) ($c['health'] ?? ''));
            ?>
          <article class="rpm-card rag-<?php echo esc_attr($rag); ?>">
            <h3><?php echo esc_html($c['name'] ?? $c['code']); ?></h3>
            <p class="rpm-rag"><?php echo esc_html($c['health'] ?? '—'); ?></p>
            <p class="rpm-sum"><?php echo esc_html($c['summary'] ?? ''); ?></p>
            <ul class="rpm-cover">
              <li><?php echo !empty($c['cover']['syspro']) ? 'SYSPRO on' : 'SYSPRO off'; ?></li>
              <li><?php echo !empty($c['cover']['rmm']) ? 'RMM on' : 'RMM off'; ?></li>
              <li><?php echo !empty($c['cover']['cove']) ? 'Backup on' : 'Backup off'; ?></li>
              <li><?php echo !empty($c['cover']['epp']) ? 'EPP on' : 'EPP off'; ?></li>
              <li><?php echo !empty($c['cover']['csp']) ? 'M365 on' : 'M365 off'; ?></li>
            </ul>
          </article>
        <?php endforeach; ?>
      </div>
    </div>
    <?php
    return (string) ob_get_clean();
}

add_shortcode('rpm_assure_estate', 'rpm_assure_render');

add_action('wp_enqueue_scripts', function () {
    wp_register_style('rpm-assure-embed', false);
    wp_enqueue_style('rpm-assure-embed');
    wp_add_inline_style('rpm-assure-embed', '
      .rpm-assure{font-family:Poppins,system-ui,sans-serif;color:#2C3E50}
      .rpm-assure-kpis{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 24px}
      .rpm-kpi{background:#ECF0F1;border-radius:16px;padding:16px 20px;min-width:88px}
      .rpm-kpi span{display:block;font-size:28px;font-weight:800;line-height:1}
      .rpm-kpi.is-g{background:#e8f8ef}.rpm-kpi.is-a{background:#fdf6d8}.rpm-kpi.is-r{background:#fdecea}
      .rpm-assure-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
      .rpm-card{background:#fff;border-radius:24px;padding:24px;box-shadow:0 8px 24px rgba(44,62,80,.08)}
      .rpm-card h3{margin:0 0 8px;font-size:18px}
      .rpm-rag{margin:0;font-weight:700}
      .rag-green .rpm-rag{color:#2ECC71}.rag-amber .rpm-rag{color:#d4a017}.rag-red .rpm-rag{color:#E74C3C}
      .rpm-sum{color:#7F8C8D;font-size:14px}
      .rpm-cover{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none;font-size:12px;color:#7F8C8D}
    ');
});
